import { PopularList, type PopularItem } from '../../src/components/PopularList';

const items: PopularItem[] = [
  { id: 'pl-monstera', name: 'Monstera Deliciosa', unitsSold: 128 },
  { id: 'pl-snake', name: 'Snake Plant', unitsSold: 96 },
  { id: 'pl-pothos', name: 'Golden Pothos', unitsSold: 80 },
  { id: 'pl-zz', name: 'ZZ Plant', unitsSold: 64 },
  { id: 'pl-calathea', name: 'Calathea Orbifolia', unitsSold: 40 },
];

describe('PopularList', () => {
  it('T5: Popular right now omits currentId, keeps ≤4 links in unitsSold order', { tags: '@component' }, () => {
    cy.mount(<PopularList items={items} currentId="pl-monstera" />);

    cy.findByRole('region', { name: 'Popular right now' }).within(() => {
      cy.findByRole('heading', { level: 2, name: 'Popular right now' });
      cy.findAllByRole('link').then(($links) => {
        expect($links, 'at most four plants').to.have.length(4);
        const names = [...$links].map((el) => el.textContent?.trim());
        expect(names).to.deep.equal(['Snake Plant', 'Golden Pothos', 'ZZ Plant', 'Calathea Orbifolia']);
        expect(names).not.to.include('Monstera Deliciosa');
        [...$links].forEach((el) => {
          const href = el.getAttribute('href') ?? '';
          expect(href, `link ${el.textContent}`).to.match(/^\/plants\/pl-/);
        });
      });
      cy.findByText('96 sold this month');
      cy.findByText('80 sold this month');
      cy.findByText('64 sold this month');
      cy.findByText('40 sold this month');
    });
  });
});
