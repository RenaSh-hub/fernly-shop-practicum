describe('Plant page popular slot', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.intercept('GET', '/api/plants?*', { fixture: 'plants/plant-detail-all-names.json' }).as('plants');
    cy.intercept('GET', '/api/popular*', { fixture: 'popular/popular-five.json' }).as('popular');
  });

  it('T6: ≥2 plant pages show ≤4 other popular plants; current id omitted', { tags: '@ui' }, () => {
    cy.intercept('GET', '/api/plants/pl-monstera', { fixture: 'plants/plant-detail-monstera.json' }).as('monstera');
    cy.visit('/plants/pl-monstera');
    cy.wait(['@monstera', '@popular']);

    cy.findByRole('region', { name: 'Popular right now' }).within(() => {
      cy.findAllByRole('link').then(($links) => {
        expect($links, '≤4 popular plants').to.have.length.at.most(4);
        expect($links, 'four others when API returns five including current').to.have.length(4);
        const names = [...$links].map((el) => el.textContent?.trim());
        expect(names).to.deep.equal(['Snake Plant', 'Golden Pothos', 'ZZ Plant', 'Calathea Orbifolia']);
        expect(names).not.to.include('Monstera Deliciosa');
      });
      cy.findAllByText(/sold this month/).should('have.length.at.least', 1);
    });

    cy.intercept('GET', '/api/plants/pl-snake', { fixture: 'plants/plant-detail-snake.json' }).as('snake');
    cy.visit('/plants/pl-snake');
    cy.wait(['@snake', '@popular']);

    cy.url().should('include', '/plants/pl-snake');
    cy.findByRole('region', { name: 'Popular right now' }).within(() => {
      cy.findAllByRole('link').then(($links) => {
        expect($links, '≤4 popular plants on snake page').to.have.length.at.most(4);
        const names = [...$links].map((el) => el.textContent?.trim());
        expect(names).not.to.include('Snake Plant');
        expect(names[0], 'most popular first among remaining').to.equal('Monstera Deliciosa');
      });
      cy.findAllByText(/sold this month/).should('have.length.at.least', 1);
    });
  });
});

