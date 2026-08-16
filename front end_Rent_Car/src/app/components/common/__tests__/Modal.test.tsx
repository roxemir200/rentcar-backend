import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmModal, Modal } from '../Modal'

describe('components/Modal', () => {
  it('ne rend rien tant qu’il est fermé', () => {
    render(<Modal isOpen={false} onClose={vi.fn()} title="Titre">Contenu</Modal>)

    expect(screen.queryByText('Contenu')).not.toBeInTheDocument()
  })

  it('rend le titre, le contenu et le pied de page dans un portail sur <body>', () => {
    const { baseElement, container } = render(
      <Modal isOpen onClose={vi.fn()} title="Titre" footer={<button>OK</button>}>
        Contenu
      </Modal>,
    )

    expect(screen.getByText('Titre')).toBeInTheDocument()
    expect(screen.getByText('Contenu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument()
    // Le contenu vit dans document.body, pas dans le conteneur de rendu
    expect(container).toBeEmptyDOMElement()
    expect(baseElement).toContainElement(screen.getByText('Contenu'))
  })

  it('n’affiche pas d’en-tête sans titre', () => {
    render(<Modal isOpen onClose={vi.fn()}>Contenu</Modal>)

    expect(screen.queryByRole('button', { name: 'Fermer' })).not.toBeInTheDocument()
  })

  it('ferme au clic sur la croix', async () => {
    const onClose = vi.fn()
    render(<Modal isOpen onClose={onClose} title="Titre">Contenu</Modal>)

    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ferme au clic sur l’arrière-plan', async () => {
    const onClose = vi.fn()
    const { baseElement } = render(<Modal isOpen onClose={onClose} title="T">Contenu</Modal>)

    const backdrop = baseElement.querySelector('.absolute.inset-0')!
    await userEvent.click(backdrop)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ferme à la touche Échap', async () => {
    const onClose = vi.fn()
    render(<Modal isOpen onClose={onClose} title="T">Contenu</Modal>)

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignore les autres touches', async () => {
    const onClose = vi.fn()
    render(<Modal isOpen onClose={onClose} title="T">Contenu</Modal>)

    await userEvent.keyboard('{Enter}')

    expect(onClose).not.toHaveBeenCalled()
  })

  it('bloque le défilement du body à l’ouverture et le restaure à la fermeture', () => {
    const { rerender } = render(<Modal isOpen onClose={vi.fn()} title="T">C</Modal>)
    expect(document.body.style.overflow).toBe('hidden')

    rerender(<Modal isOpen={false} onClose={vi.fn()} title="T">C</Modal>)
    expect(document.body.style.overflow).toBe('')
  })

  it.each([
    ['sm', 'max-w-sm'],
    ['md', 'max-w-lg'],
    ['lg', 'max-w-2xl'],
    ['xl', 'max-w-4xl'],
  ] as const)('applique la largeur de la taille %s', (size, expected) => {
    const { baseElement } = render(<Modal isOpen onClose={vi.fn()} size={size} title="T">C</Modal>)

    expect(baseElement.querySelector(`.${expected}`)).toBeInTheDocument()
  })
})

describe('components/ConfirmModal', () => {
  const setup = (props: Partial<Parameters<typeof ConfirmModal>[0]> = {}) => {
    const onClose = vi.fn()
    const onConfirm = vi.fn()
    render(
      <ConfirmModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        title="Supprimer la voiture"
        message="Cette action est irréversible."
        {...props}
      />,
    )
    return { onClose, onConfirm }
  }

  it('affiche le titre, le message et les deux actions', () => {
    setup()

    expect(screen.getByText('Supprimer la voiture')).toBeInTheDocument()
    expect(screen.getByText('Cette action est irréversible.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeInTheDocument()
  })

  it('utilise le libellé de confirmation personnalisé', () => {
    setup({ confirmLabel: 'Supprimer' })

    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument()
  })

  it('déclenche onConfirm au clic sur le bouton de confirmation', async () => {
    const { onConfirm } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('déclenche onClose au clic sur Annuler', async () => {
    const { onClose } = setup()

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('désactive les deux actions quand confirmDisabled est vrai', async () => {
    const { onConfirm, onClose } = setup({ confirmDisabled: true })

    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('applique le style danger au bouton de confirmation', () => {
    setup({ danger: true })

    expect(screen.getByRole('button', { name: 'Confirmer' })).toHaveClass('bg-destructive')
  })
})
