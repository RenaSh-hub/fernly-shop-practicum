const LONG_NAME =
  'Supercalifragilisticexpialidocious Window Fern With An Exceptionally Long Common Name That Must Wrap';

const PLANT_POSITIVE = 'pl-test-detail';
const PLANT_LONG_NAME = 'pl-long-name-detail';
const PLANT_PRICE_ZERO = 'pl-zero-ui';
const PLANT_SERVER_ERROR = 'pl-err-ui';

describe('Plant page (/plants/:plantId)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('shows plant name, price, and named links for similar plants', { tags: '@ui' }, () => {
    cy.intercept('GET', `/api/plants/${PLANT_POSITIVE}`, { fixture: 'plants/plant-detail-positive.json' }).as('plant');
    cy.intercept('GET', '/api/plants?*', { fixture: 'plants/plant-detail-all-names.json' }).as('plants');
    cy.visit(`/plants/${PLANT_POSITIVE}`);
    cy.wait(['@plant', '@plants']);

    cy.findByRole('heading', { level: 1, name: 'Monstera Deliciosa' });
    cy.findByText('$34.99');
    cy.findByRole('heading', { level: 2, name: 'Likes the same light' }).then(($h) => {
      cy.wrap($h.closest('section')).within(() => {
        cy.findByRole('link', { name: 'Snake Plant' });
        cy.findByRole('link', { name: 'ZZ Plant' });
      });
    });
  });

  it('keeps a very long plant name inside the heading line box', { tags: '@ui' }, () => {
    cy.intercept('GET', `/api/plants/${PLANT_LONG_NAME}`, { fixture: 'plants/plant-detail-long-name.json' }).as('plant');
    cy.intercept('GET', '/api/plants?*', { fixture: 'plants/plant-detail-all-empty.json' }).as('plants');
    cy.visit(`/plants/${PLANT_LONG_NAME}`);
    cy.wait(['@plant', '@plants']);

    cy.findByRole('heading', { level: 1, name: LONG_NAME }).then(($h) => {
      expect($h[0].scrollWidth, 'long name wraps within heading width').to.be.lte($h[0].clientWidth + 1);
    });
  });

  it('shows $0.00 when the plant base price is zero', { tags: ['@ui', '@known-bug'] }, () => {
    cy.intercept('GET', `/api/plants/${PLANT_PRICE_ZERO}`, { fixture: 'plants/plant-detail-price-zero.json' }).as('plant');
    cy.intercept('GET', '/api/plants?*', { fixture: 'plants/plant-detail-all-empty.json' }).as('plants');
    cy.visit(`/plants/${PLANT_PRICE_ZERO}`);
    cy.wait(['@plant', '@plants']);

    cy.findByRole('heading', { level: 1, name: 'Succulent Cutting' });
    cy.findByText('$0.00');
  });

  it('shows an error alert with Try again when the plant request fails', { tags: '@ui' }, () => {
    cy.intercept('GET', `/api/plants/${PLANT_SERVER_ERROR}`, {
      statusCode: 500,
      fixture: 'plants/plant-detail-server-error.json',
    }).as('plant');
    cy.intercept('GET', '/api/plants?*', { fixture: 'plants/plant-detail-all-empty.json' }).as('plants');
    cy.visit(`/plants/${PLANT_SERVER_ERROR}`);
    cy.wait(['@plant', '@plants']);

    cy.findByRole('alert');
    cy.findByRole('button', { name: 'Try again' });
  });
});
