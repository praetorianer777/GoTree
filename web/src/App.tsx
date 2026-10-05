import { useTranslation } from 'react-i18next'
import { Route, Routes } from 'react-router'
import { AuthGate } from './auth/AuthGate'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { NotFound } from './pages/NotFound'
import { PeoplePage } from './pages/PeoplePage'
import { PersonPage } from './pages/PersonPage'
import { Placeholder } from './pages/Placeholder'
import { TreePage } from './pages/TreePage'

export function App() {
  const { t } = useTranslation()
  return (
    <AuthGate>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="people/:id" element={<PersonPage />} />
          <Route path="tree" element={<TreePage />} />
          <Route path="import-export" element={<Placeholder title={t('nav.importExport')} />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthGate>
  )
}
