import { Route, Routes } from 'react-router'
import { AuthGate } from './auth/AuthGate'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { NotFound } from './pages/NotFound'
import { PeoplePage } from './pages/PeoplePage'
import { PersonPage } from './pages/PersonPage'
import { QualityPage } from './pages/QualityPage'
import { RelationshipPage } from './pages/RelationshipPage'
import { ImportExportPage } from './pages/ImportExportPage'
import { MediaListPage } from './pages/MediaListPage'
import { MediaPage } from './pages/MediaPage'
import { SourcePage } from './pages/SourcePage'
import { SourcesPage } from './pages/SourcesPage'
import { TreePage } from './pages/TreePage'

export function App() {
  return (
    <AuthGate>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="people/:id" element={<PersonPage />} />
          <Route path="tree" element={<TreePage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="sources/:id" element={<SourcePage />} />
          <Route path="media" element={<MediaListPage />} />
          <Route path="media/:id" element={<MediaPage />} />
          <Route path="relationship" element={<RelationshipPage />} />
          <Route path="quality" element={<QualityPage />} />
          <Route path="import-export" element={<ImportExportPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthGate>
  )
}
