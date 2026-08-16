import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router'
import { renderWithProviders, screen } from '../../../../test/test-utils'
import { makeAdmin, makeUser } from '../../../../test/factories'
import { RequireAuth } from '../Guards'

const Protected = () => <p>Contenu protégé</p>

const renderGuard = (role: 'ADMIN' | 'CLIENT' | undefined, app: Record<string, unknown>) =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<RequireAuth role={role}><Protected /></RequireAuth>} />
      <Route path="/login" element={<p>Page de connexion</p>} />
      <Route path="/home" element={<p>Accueil</p>} />
    </Routes>,
    { app, route: '/' },
  )

describe('components/Guards · RequireAuth', () => {
  it('redirige vers /login sans token en session', () => {
    renderGuard(undefined, { currentUser: makeUser() })

    expect(screen.getByText('Page de connexion')).toBeInTheDocument()
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument()
  })

  it('redirige vers /login sans utilisateur en contexte', () => {
    localStorage.setItem('token', 'jwt')

    renderGuard(undefined, { currentUser: null })

    expect(screen.getByText('Page de connexion')).toBeInTheDocument()
  })

  it('laisse passer un utilisateur authentifié quand aucun rôle n’est exigé', () => {
    localStorage.setItem('token', 'jwt')

    renderGuard(undefined, { currentUser: makeUser() })

    expect(screen.getByText('Contenu protégé')).toBeInTheDocument()
  })

  it('laisse passer un CLIENT sur une route réservée aux clients', () => {
    localStorage.setItem('token', 'jwt')

    renderGuard('CLIENT', { currentUser: makeUser({ role: 'CLIENT' }) })

    expect(screen.getByText('Contenu protégé')).toBeInTheDocument()
  })

  it('laisse passer un ADMIN sur une route réservée aux admins', () => {
    localStorage.setItem('token', 'jwt')

    renderGuard('ADMIN', { currentUser: makeAdmin() })

    expect(screen.getByText('Contenu protégé')).toBeInTheDocument()
  })

  it('renvoie un CLIENT vers l’accueil sur une route admin', () => {
    localStorage.setItem('token', 'jwt')

    renderWithProviders(
      <Routes>
        <Route path="/" element={<p>Accueil</p>} />
        <Route path="/admin" element={<RequireAuth role="ADMIN"><Protected /></RequireAuth>} />
      </Routes>,
      { app: { currentUser: makeUser({ role: 'CLIENT' }) }, route: '/admin' },
    )

    expect(screen.getByText('Accueil')).toBeInTheDocument()
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument()
  })

  it('renvoie un ADMIN vers l’accueil sur une route strictement client', () => {
    localStorage.setItem('token', 'jwt')

    renderWithProviders(
      <Routes>
        <Route path="/" element={<p>Accueil</p>} />
        <Route path="/mine" element={<RequireAuth role="CLIENT"><Protected /></RequireAuth>} />
      </Routes>,
      { app: { currentUser: makeAdmin() }, route: '/mine' },
    )

    expect(screen.getByText('Accueil')).toBeInTheDocument()
  })
})
