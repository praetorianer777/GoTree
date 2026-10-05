# GEDCOM extensions written by GoTree

GoTree writes standard GEDCOM 5.5.1 or 7.0. Where the standard has no way to say something, it uses
the extension tags below; a GEDCOM 7 export declares them in `HEAD.SCHMA` with links to this page.
Anything GoTree read from another program and did not understand is written back unchanged.

## _frel

`FAM.CHIL._FREL <relation>` — how the child relates to the first partner of the family (`HUSB`).
Values: `Natural`, `Adopted`, `Foster`, `Step`, `Surrogate`, `Sealing`, `Unknown`. The same tag is
written by Ancestry and Family Tree Maker. Used only when the relation is not the same for both
partners or has no `PEDI` value.

## _mrel

`FAM.CHIL._MREL <relation>` — the same for the second partner (`WIFE`).

## _milt

`INDI._MILT` — military service, an event like `OCCU` with `DATE`, `PLAC` and a description.

## _stat

`<fact>._STAT <status>` with an optional `NOTE` giving the reason — marks a fact (event, attribute
or name) as `disputed` or `disproven`. GoTree keeps such facts instead of deleting them; programs
that do not know the tag still see the fact itself.
