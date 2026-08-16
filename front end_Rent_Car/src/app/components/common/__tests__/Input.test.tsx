import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input, Select, Textarea } from '../Input'

describe('components/Input', () => {
  it('associe le label au champ via l’id dérivé du name', () => {
    render(<Input label="Email" name="email" />)

    const input = screen.getByLabelText(/Email/)
    expect(input).toHaveAttribute('id', 'email')
  })

  it('privilégie l’id explicite sur le name', () => {
    render(<Input label="Email" name="email" id="custom-id" />)

    expect(screen.getByLabelText(/Email/)).toHaveAttribute('id', 'custom-id')
  })

  it('marque les champs obligatoires d’un astérisque', () => {
    render(<Input label="Email" name="email" required />)

    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('saisit la valeur tapée par l’utilisateur', async () => {
    const onChange = vi.fn()
    render(<Input label="Email" name="email" onChange={onChange} />)

    await userEvent.type(screen.getByLabelText(/Email/), 'a@b.tn')

    expect(screen.getByLabelText(/Email/)).toHaveValue('a@b.tn')
    expect(onChange).toHaveBeenCalled()
  })

  it('affiche le message d’erreur et applique le style destructif', () => {
    render(<Input label="Email" name="email" error="Format d'email invalide" />)

    expect(screen.getByText("Format d'email invalide")).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toHaveClass('border-destructive')
  })

  it('affiche le hint quand il n’y a pas d’erreur', () => {
    render(<Input label="Tel" name="phone" hint="Format tunisien" />)

    expect(screen.getByText('Format tunisien')).toBeInTheDocument()
  })

  it('masque le hint dès qu’une erreur est présente', () => {
    render(<Input label="Tel" name="phone" hint="Format tunisien" error="Obligatoire" />)

    expect(screen.queryByText('Format tunisien')).not.toBeInTheDocument()
    expect(screen.getByText('Obligatoire')).toBeInTheDocument()
  })

  it('rend les icônes gauche et droite', () => {
    render(
      <Input
        name="q"
        leftIcon={<span data-testid="left" />}
        rightIcon={<span data-testid="right" />}
      />,
    )

    expect(screen.getByTestId('left')).toBeInTheDocument()
    expect(screen.getByTestId('right')).toBeInTheDocument()
  })

  describe('champ mot de passe', () => {
    it('masque la saisie par défaut et bascule en clair au clic', async () => {
      render(<Input label="Mot de passe" name="password" type="password" />)

      const input = screen.getByLabelText(/Mot de passe/)
      expect(input).toHaveAttribute('type', 'password')

      await userEvent.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }))
      expect(input).toHaveAttribute('type', 'text')

      await userEvent.click(screen.getByRole('button', { name: 'Masquer le mot de passe' }))
      expect(input).toHaveAttribute('type', 'password')
    })

    it('n’affiche pas le bouton œil si une icône droite est fournie', () => {
      render(<Input name="password" type="password" rightIcon={<span data-testid="right" />} />)

      expect(screen.queryByRole('button', { name: /mot de passe/i })).not.toBeInTheDocument()
    })
  })

  it('expose la ref du champ natif', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input ref={ref} name="x" />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })
})

describe('components/Textarea', () => {
  it('rend un label lié et accepte la saisie', async () => {
    render(<Textarea label="Commentaire" name="comment" />)

    const field = screen.getByLabelText(/Commentaire/)
    await userEvent.type(field, 'Super voiture')

    expect(field).toHaveValue('Super voiture')
  })

  it('affiche l’erreur et le style destructif', () => {
    render(<Textarea label="Commentaire" name="comment" error="Trop court" />)

    expect(screen.getByText('Trop court')).toBeInTheDocument()
    expect(screen.getByLabelText(/Commentaire/)).toHaveClass('border-destructive')
  })

  it('marque le champ obligatoire', () => {
    render(<Textarea label="Commentaire" name="comment" required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('expose la ref du textarea natif', () => {
    const ref = createRef<HTMLTextAreaElement>()
    render(<Textarea ref={ref} name="c" />)

    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  })
})

describe('components/Select', () => {
  const options = [
    { value: 'Essence', label: 'Essence' },
    { value: 'Diesel', label: 'Diesel' },
  ]

  it('rend toutes les options fournies', () => {
    render(<Select label="Carburant" name="fuel" options={options} />)

    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('ajoute une option vide quand un placeholder est fourni', () => {
    render(<Select label="Carburant" name="fuel" options={options} placeholder="Tous" />)

    const opts = screen.getAllByRole('option')
    expect(opts).toHaveLength(3)
    expect(opts[0]).toHaveValue('')
    expect(opts[0]).toHaveTextContent('Tous')
  })

  it('remonte la sélection de l’utilisateur', async () => {
    const onChange = vi.fn()
    render(<Select label="Carburant" name="fuel" options={options} onChange={onChange} defaultValue="" />)

    await userEvent.selectOptions(screen.getByLabelText(/Carburant/), 'Diesel')

    expect(onChange).toHaveBeenCalled()
    expect(screen.getByLabelText(/Carburant/)).toHaveValue('Diesel')
  })

  it('affiche l’erreur associée', () => {
    render(<Select label="Carburant" name="fuel" options={options} error="Choix obligatoire" />)

    expect(screen.getByText('Choix obligatoire')).toBeInTheDocument()
    expect(screen.getByLabelText(/Carburant/)).toHaveClass('border-destructive')
  })

  it('marque le champ obligatoire et expose sa ref', () => {
    const ref = createRef<HTMLSelectElement>()
    render(<Select ref={ref} label="Carburant" name="fuel" options={options} required />)

    expect(screen.getByText('*')).toBeInTheDocument()
    expect(ref.current).toBeInstanceOf(HTMLSelectElement)
  })
})
