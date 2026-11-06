import { useState } from 'react';
import { SearchBox } from '../../src/components/SearchBox';

function searchField() {
  return cy.findByRole('searchbox');
}

describe('SearchBox', () => {
  describe('render and state', () => {
    it(
      'SB-01: hint Search plants, Search button, empty field, no Clear',
      { tags: '@component' },
      () => {
        cy.mount(<SearchBox value="" onSearch={cy.spy()} />);

        cy.findByText('Search plants').should('be.visible');
        cy.findByRole('button', { name: 'Search' }).should('exist');
        searchField().then(($input) => {
          expect($input, 'field value').to.have.value('');
        });
        cy.findByRole('button', { name: 'Clear search' }).should('not.exist');
      },
    );

    it('SB-02: field shows monstera, hint gone, Clear present', { tags: '@component' }, () => {
      cy.mount(<SearchBox value="monstera" onSearch={cy.spy()} />);

      searchField().then(($input) => {
        expect($input, 'field value').to.have.value('monstera');
      });
      cy.findByText('Search plants').should('not.exist');
      cy.findByRole('button', { name: 'Clear search' }).should('exist');
    });
  });

  describe('boundary', () => {
    it('SB-03: one character shows Clear', { tags: '@component' }, () => {
      cy.mount(<SearchBox value="a" onSearch={cy.spy()} />);

      searchField().then(($input) => {
        expect($input, 'field value').to.have.value('a');
      });
      cy.findByRole('button', { name: 'Clear search' }).should('exist');
    });

    it('SB-04: whitespace-only value shows Clear, hint gone', { tags: '@component' }, () => {
      cy.mount(<SearchBox value="   " onSearch={cy.spy()} />);

      searchField().then(($input) => {
        expect($input, 'field value').to.have.value('   ');
      });
      cy.findByText('Search plants').should('not.exist');
      cy.findByRole('button', { name: 'Clear search' }).should('exist');
    });

    it('SB-05: exactly one button (Search)', { tags: '@component' }, () => {
      cy.mount(<SearchBox value="" onSearch={cy.spy()} />);

      cy.findAllByRole('button').then(($buttons) => {
        expect($buttons, 'button count').to.have.length(1);
        expect($buttons[0], 'button name').to.have.attr('type', 'submit');
      });
      cy.findByRole('button', { name: 'Search' }).should('exist');
    });

    it('SB-06: Search and Clear search buttons', { tags: '@component' }, () => {
      cy.mount(<SearchBox value="x" onSearch={cy.spy()} />);

      cy.findAllByRole('button').then(($buttons) => {
        expect($buttons, 'button count').to.have.length(2);
      });
      cy.findByRole('button', { name: 'Search' }).should('exist');
      cy.findByRole('button', { name: 'Clear search' }).should('exist');
    });
  });

  describe('interaction', () => {
    it('SB-07: typing does not call onSearch until submit', { tags: '@component' }, () => {
      const onSearch = cy.spy().as('onSearch');
      cy.mount(<SearchBox value="" onSearch={onSearch} />);

      searchField().type('Monstera');

      cy.get('@onSearch').should('not.have.been.called');
      searchField().then(($input) => {
        expect($input, 'draft').to.have.value('Monstera');
      });
      cy.findByText('Search plants').should('not.exist');
      cy.findByRole('button', { name: 'Clear search' }).should('exist');
    });

    it('SB-08: Search calls onSearch with Monstera', { tags: '@component' }, () => {
      const onSearch = cy.spy().as('onSearch');
      cy.mount(<SearchBox value="" onSearch={onSearch} />);

      searchField().type('Monstera');
      cy.findByRole('button', { name: 'Search' }).click();

      cy.get('@onSearch').should('have.been.calledOnceWithExactly', 'Monstera');
    });

    it('SB-09: submit trims leading and trailing space', { tags: '@component' }, () => {
      const onSearch = cy.spy().as('onSearch');
      cy.mount(<SearchBox value="" onSearch={onSearch} />);

      searchField().type('  monstera  ');
      cy.findByRole('button', { name: 'Search' }).click();

      cy.get('@onSearch').should('have.been.calledOnceWithExactly', 'monstera');
    });

    it('SB-10: whitespace-only draft submits empty string', { tags: '@component' }, () => {
      const onSearch = cy.spy().as('onSearch');
      cy.mount(<SearchBox value="" onSearch={onSearch} />);

      searchField().type('   ');
      cy.findByRole('button', { name: 'Search' }).click();

      cy.get('@onSearch').should('have.been.calledOnceWithExactly', '');
    });

    it('SB-11: re-submit committed value without editing', { tags: '@component' }, () => {
      const onSearch = cy.spy().as('onSearch');
      cy.mount(<SearchBox value="fern" onSearch={onSearch} />);

      cy.findByRole('button', { name: 'Search' }).click();

      cy.get('@onSearch').should('have.been.calledOnceWithExactly', 'fern');
    });

    it('SB-12: Clear search resets field and calls onSearch with empty', { tags: '@component' }, () => {
      const onSearch = cy.spy().as('onSearch');
      cy.mount(<SearchBox value="monstera" onSearch={onSearch} />);

      cy.findByRole('button', { name: 'Clear search' }).click();

      cy.get('@onSearch').should('have.been.calledOnceWithExactly', '');
      searchField().then(($input) => {
        expect($input, 'field value').to.have.value('');
      });
      cy.findByText('Search plants').should('be.visible');
      cy.findByRole('button', { name: 'Clear search' }).should('not.exist');
    });
  });

  describe('state sync', () => {
    it('SB-13: field updates when parent value changes', { tags: '@component' }, () => {
      function Harness() {
        const [value, setValue] = useState('fern');
        return (
          <>
            <SearchBox value={value} onSearch={setValue} />
            <button type="button" onClick={() => setValue('aloe')}>
              Set aloe
            </button>
          </>
        );
      }

      cy.mount(<Harness />);

      searchField().then(($input) => {
        expect($input, 'initial value').to.have.value('fern');
      });
      cy.findByRole('button', { name: 'Set aloe' }).click();
      searchField().then(($input) => {
        expect($input, 'updated value').to.have.value('aloe');
      });
    });
  });

  describe('accessibility', () => {
    it('SB-14: search landmark', { tags: '@component' }, () => {
      cy.mount(<SearchBox value="" onSearch={cy.spy()} />);

      cy.findByRole('search').should('exist');
    });

    it('SB-15: search field named Search plants when empty', { tags: '@component' }, () => {
      cy.mount(<SearchBox value="" onSearch={cy.spy()} />);

      cy.findByRole('searchbox', { name: 'Search plants' }).should('exist');
    });

    it('SB-16: search field named Search plants when filled', { tags: '@component' }, () => {
      cy.mount(<SearchBox value="monstera" onSearch={cy.spy()} />);

      cy.findByRole('searchbox', { name: 'Search plants' }).should('exist');
    });

    it('SB-17: only Search button when empty', { tags: '@component' }, () => {
      cy.mount(<SearchBox value="" onSearch={cy.spy()} />);

      cy.findAllByRole('button').then(($buttons) => {
        expect($buttons, 'button count').to.have.length(1);
      });
      cy.findByRole('button', { name: 'Search' }).should('exist');
    });

    it('SB-18: Search and Clear search both named when filled', { tags: '@component' }, () => {
      cy.mount(<SearchBox value="monstera" onSearch={cy.spy()} />);

      cy.findByRole('button', { name: 'Search' }).should('exist');
      cy.findByRole('button', { name: 'Clear search' }).should('exist');
    });

    it('SB-19: Enter submits search', { tags: '@component' }, () => {
      const onSearch = cy.spy().as('onSearch');
      cy.mount(<SearchBox value="" onSearch={onSearch} />);

      searchField().type('pothos{enter}');

      cy.get('@onSearch').should('have.been.calledWith', 'pothos');
    });
  });
});
