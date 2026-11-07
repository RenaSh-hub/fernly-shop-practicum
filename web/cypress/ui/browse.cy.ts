const LONG_NAME =
  'Supercalifragilisticexpialidocious Window Fern With An Exceptionally Long Common Name That Must Wrap';

describe('Browse page (/)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('shows two plant cards and a "2 plants" heading when the catalog has two plants', { tags: '@ui' }, () => {
    cy.intercept('GET', '/api/plants?*', { fixture: 'plants/browse-positive.json' }).as('plants');
    cy.visit('/');
    cy.wait('@plants');

    cy.findByRole('heading', { name: '2 plants' });
    cy.findAllByRole('article').should('have.length', 2);
    cy.findByRole('heading', { level: 3, name: 'Monstera Deliciosa' });
    cy.findByRole('heading', { level: 3, name: 'Snake Plant' });
  });

  it('shows the empty state when the catalog has no plants', { tags: '@ui' }, () => {
    cy.intercept('GET', '/api/plants?*', { fixture: 'plants/browse-empty.json' }).as('plants');
    cy.visit('/');
    cy.wait('@plants');

    cy.findByRole('heading', { name: '0 plants' });
    cy.findByRole('region', { name: '0 plants' }).within(() => {
      cy.findByRole('heading', { level: 2, name: 'No plants match your filters' });
      cy.findByText('Try another search or clear a filter.');
    });
  });

  it('keeps a very long plant name inside its card', { tags: '@ui' }, () => {
    cy.intercept('GET', '/api/plants?*', { fixture: 'plants/browse-long-name.json' }).as('plants');
    cy.visit('/');
    cy.wait('@plants');

    cy.findByRole('article').within(() => {
      cy.findByRole('heading', { level: 3, name: LONG_NAME })
        .findByRole('link', { name: LONG_NAME })
        .then(($link) => {
          expect($link[0].scrollWidth, 'name wraps inside card width').to.be.lte($link[0].clientWidth + 1);
        });
    });
  });

  it('shows $0.00 when a plant is priced at zero', { tags: '@ui' }, () => {
    cy.intercept('GET', '/api/plants?*', { fixture: 'plants/browse-price-zero.json' }).as('plants');
    cy.visit('/');
    cy.wait('@plants');

    cy.findByRole('heading', { level: 3, name: 'Succulent Cutting' });
    cy.findByText('$0.00');
  });

  it('shows an error alert with Try again when the catalog request fails', { tags: '@ui' }, () => {
    cy.intercept('GET', '/api/plants?*', {
      statusCode: 500,
      fixture: 'plants/browse-server-error.json',
    }).as('plants');
    cy.visit('/');
    cy.wait('@plants');

    cy.findByRole('alert');
    cy.findByRole('button', { name: 'Try again' });
  });
});
