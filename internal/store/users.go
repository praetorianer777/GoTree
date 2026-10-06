package store

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"
)

// User is an account.
type User struct {
	ID          int64  `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
}

// UserRoleAdmin is the role of users who manage the whole instance, such
// as downloading backups.
const UserRoleAdmin = "admin"

// Session is an authenticated browser session.
type Session struct {
	User   User
	TreeID int64
	// TreeRole is the user's role in TreeID.
	TreeRole string
}

// Actor returns the actor for operations performed in this session.
func (s Session) Actor() Actor {
	return Actor{UserID: s.User.ID, TreeID: s.TreeID, Role: s.TreeRole}
}

// SessionTTL is how long a session stays valid without being used.
const SessionTTL = 30 * 24 * time.Hour

// MinPasswordLength is the shortest accepted password.
const MinPasswordLength = 10

// ErrSetupDone is returned by Setup once any user exists.
var ErrSetupDone = errors.New("setup has already been completed")

// ErrBadCredentials is returned for an unknown user or a wrong password.
var ErrBadCredentials = errors.New("wrong username or password")

// SetupInput creates the first administrator and their tree.
type SetupInput struct {
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Password    string `json:"password"`
	TreeName    string `json:"treeName"`
}

// NeedsSetup reports whether no account exists yet.
func (s *Store) NeedsSetup(ctx context.Context) (bool, error) {
	var n int
	err := s.DB.QueryRowContext(ctx, `SELECT count(*) FROM users`).Scan(&n)
	return n == 0, err
}

// Setup creates the first admin and the first tree. It fails with
// ErrSetupDone once any user exists, so it cannot be used to add accounts.
func (s *Store) Setup(ctx context.Context, in SetupInput) (User, error) {
	in.Username = strings.TrimSpace(in.Username)
	in.DisplayName = strings.TrimSpace(in.DisplayName)
	in.TreeName = strings.TrimSpace(in.TreeName)
	if in.TreeName == "" {
		in.TreeName = "Family tree"
	}
	var v validator
	v.check(validUsername(in.Username), "username", "use 2–64 letters, digits, dots, dashes or underscores")
	v.check(utf8.RuneCountInString(in.Password) >= MinPasswordLength, "password", "must be at least 10 characters")
	v.check(len(in.Password) <= 72, "password", "must be at most 72 bytes")
	v.check(utf8.RuneCountInString(in.TreeName) <= 200, "treeName", "is too long")
	if err := v.err(); err != nil {
		return User{}, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, err
	}

	var u User
	err = s.tx(ctx, func(tx *sql.Tx) error {
		// The transaction takes the write lock up front (_txlock=immediate),
		// so two concurrent setups cannot both see an empty table.
		var n int
		if err := tx.QueryRowContext(ctx, `SELECT count(*) FROM users`).Scan(&n); err != nil {
			return err
		}
		if n > 0 {
			return ErrSetupDone
		}
		now := s.now()
		res, err := tx.ExecContext(ctx, `
			INSERT INTO users (username, display_name, password_hash, role, created_at, updated_at)
			VALUES (?, ?, ?, 'admin', ?, ?)`, in.Username, in.DisplayName, string(hash), now, now)
		if err != nil {
			return err
		}
		uid, _ := res.LastInsertId()
		res, err = tx.ExecContext(ctx, `INSERT INTO trees (name, created_at, updated_at) VALUES (?, ?, ?)`, in.TreeName, now, now)
		if err != nil {
			return err
		}
		tid, _ := res.LastInsertId()
		if _, err := tx.ExecContext(ctx, `INSERT INTO tree_members (tree_id, user_id, role) VALUES (?, ?, 'owner')`, tid, uid); err != nil {
			return err
		}
		u = User{ID: uid, Username: in.Username, DisplayName: in.DisplayName, Role: UserRoleAdmin}
		return nil
	})
	return u, err
}

func validUsername(s string) bool {
	if len(s) < 2 || len(s) > 64 {
		return false
	}
	for _, r := range s {
		ok := r == '.' || r == '-' || r == '_' || r == '@' ||
			(r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9')
		if !ok {
			return false
		}
	}
	return true
}

// dummyHash makes a login for an unknown user cost as much as one with a
// wrong password, so response times do not reveal which usernames exist.
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("gotree-dummy-password"), bcrypt.DefaultCost)

// Authenticate checks a username and password.
func (s *Store) Authenticate(ctx context.Context, username, password string) (User, error) {
	var u User
	var hash string
	err := s.DB.QueryRowContext(ctx, `
		SELECT id, username, display_name, role, password_hash FROM users WHERE username = ?`,
		strings.TrimSpace(username)).Scan(&u.ID, &u.Username, &u.DisplayName, &u.Role, &hash)
	if errors.Is(err, sql.ErrNoRows) {
		_ = bcrypt.CompareHashAndPassword(dummyHash, []byte(password))
		return User{}, ErrBadCredentials
	}
	if err != nil {
		return User{}, err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return User{}, ErrBadCredentials
	}
	return u, nil
}

// CreateSession starts a session for the user in their first tree and
// returns the token for the cookie.
func (s *Store) CreateSession(ctx context.Context, userID int64, userAgent string) (string, error) {
	token, err := newToken()
	if err != nil {
		return "", err
	}
	if len(userAgent) > 300 {
		userAgent = userAgent[:300]
	}

	var treeID sql.NullInt64
	err = s.DB.QueryRowContext(ctx, `SELECT tree_id FROM tree_members WHERE user_id = ? ORDER BY tree_id LIMIT 1`, userID).Scan(&treeID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return "", err
	}

	now := s.Now().UTC()
	_, err = s.DB.ExecContext(ctx, `
		INSERT INTO sessions (token_hash, user_id, tree_id, created_at, last_seen_at, expires_at, user_agent)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		hashToken(token), userID, treeID, now.Format(time.RFC3339Nano), now.Format(time.RFC3339Nano),
		now.Add(SessionTTL).Format(time.RFC3339Nano), userAgent)
	if err != nil {
		return "", err
	}
	return token, nil
}

// SessionByToken resolves a cookie token. Expired and unknown tokens give
// ErrNotFound. Using a session extends it, at most once a minute.
func (s *Store) SessionByToken(ctx context.Context, token string) (Session, error) {
	if token == "" {
		return Session{}, ErrNotFound
	}
	h := hashToken(token)
	now := s.Now().UTC()

	var sess Session
	var treeID sql.NullInt64
	var treeRole sql.NullString
	var lastSeen, expires string
	err := s.DB.QueryRowContext(ctx, `
		SELECT u.id, u.username, u.display_name, u.role, s.tree_id, m.role, s.last_seen_at, s.expires_at
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		LEFT JOIN tree_members m ON m.tree_id = s.tree_id AND m.user_id = s.user_id
		WHERE s.token_hash = ?`, h).Scan(
		&sess.User.ID, &sess.User.Username, &sess.User.DisplayName, &sess.User.Role,
		&treeID, &treeRole, &lastSeen, &expires)
	if errors.Is(err, sql.ErrNoRows) {
		return Session{}, ErrNotFound
	}
	if err != nil {
		return Session{}, err
	}
	exp, err := time.Parse(time.RFC3339Nano, expires)
	if err != nil || !now.Before(exp) {
		_, _ = s.DB.ExecContext(ctx, `DELETE FROM sessions WHERE token_hash = ?`, h)
		return Session{}, ErrNotFound
	}
	// A membership that was removed leaves the session without a tree.
	if treeRole.Valid {
		sess.TreeID, sess.TreeRole = treeID.Int64, treeRole.String
	}

	if seen, err := time.Parse(time.RFC3339Nano, lastSeen); err == nil && now.Sub(seen) > time.Minute {
		_, _ = s.DB.ExecContext(ctx, `UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?`,
			now.Format(time.RFC3339Nano), now.Add(SessionTTL).Format(time.RFC3339Nano), h)
	}
	return sess, nil
}

// DeleteSession ends a session.
func (s *Store) DeleteSession(ctx context.Context, token string) error {
	_, err := s.DB.ExecContext(ctx, `DELETE FROM sessions WHERE token_hash = ?`, hashToken(token))
	return err
}

// PruneSessions removes expired sessions.
func (s *Store) PruneSessions(ctx context.Context) error {
	_, err := s.DB.ExecContext(ctx, `DELETE FROM sessions WHERE expires_at <= ?`, s.now())
	return err
}

// TreeName returns the name of a tree.
func (s *Store) TreeName(ctx context.Context, treeID int64) (string, error) {
	var name string
	err := s.DB.QueryRowContext(ctx, `SELECT name FROM trees WHERE id = ?`, treeID).Scan(&name)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	return name, err
}

// newToken returns 256 random bits, URL-safe.
func newToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func hashToken(token string) []byte {
	h := sha256.Sum256([]byte(token))
	return h[:]
}
