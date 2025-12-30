import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AuthorityProvider, useAuthority } from './index'

afterEach(() => {
  cleanup()
})

describe('@sthira/react', () => {
  describe('AuthorityProvider', () => {
    it('provides authority context to children', () => {
      const TestComponent = () => {
        const authority = useAuthority()
        return (
          <div data-testid="authority">
            {authority ? 'has-authority' : 'no-authority'}
          </div>
        )
      }

      const { getByTestId } = render(
        <AuthorityProvider>
          <TestComponent />
        </AuthorityProvider>
      )

      expect(getByTestId('authority').textContent).toBe('has-authority')
    })

    it('throws when useAuthority is used outside provider', () => {
      const TestComponent = () => {
        useAuthority()
        return <div>test</div>
      }

      expect(() => render(<TestComponent />)).toThrow(
        'useAuthority must be used within an AuthorityProvider'
      )
    })
  })
})
