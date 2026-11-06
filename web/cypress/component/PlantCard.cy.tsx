import { PlantCard } from '../../src/components/PlantCard';
import type { PlantSummary } from '../../src/types';

const defaultPlant: PlantSummary = {
  id: 'pl-monstera',
  name: 'Monstera Deliciosa',
  latinName: 'Monstera deliciosa',
  price: 24.5,
  light: 'medium',
  careLevel: 1,
  petSafe: false,
  stock: 12,
  rating: 4.7,
  imageUrl: '/plants/monstera.svg',
};

const LONG_NAME =
  'Supercalifragilisticexpialidocious Window Fern With An Exceptionally Long Common Name That Must Wrap';

function mountWithSave(
  plant: PlantSummary = defaultPlant,
  options?: {
    saved?: boolean;
    onToggleSave?: (plantId: string) => void;
  },
) {
  const onToggleSave = options?.onToggleSave ?? cy.spy();
  if (options?.saved === undefined) {
    cy.mount(<PlantCard plant={plant} onToggleSave={onToggleSave} />);
  } else {
    cy.mount(<PlantCard plant={plant} saved={options.saved} onToggleSave={onToggleSave} />);
  }
}

function saveButton() {
  return cy.findByRole('button');
}

describe('PlantCard', () => {
  describe('render', () => {
    it('PC-01: heading and Latin name', { tags: '@component' }, () => {
      mountWithSave();

      cy.findByRole('article').within(() => {
        cy.findByRole('heading', { level: 3, name: 'Monstera Deliciosa' });
        cy.findByText('Monstera deliciosa');
      });
    });

    it('PC-02: image named Monstera Deliciosa', { tags: '@component' }, () => {
      mountWithSave();

      cy.findByRole('img', { name: 'Monstera Deliciosa' }).should('exist');
    });

    it('PC-03: two plant links to /plants/pl-monstera', { tags: '@component' }, () => {
      mountWithSave();

      cy.findAllByRole('link', { name: 'Monstera Deliciosa' }).then(($links) => {
        expect($links, 'link count').to.have.length(2);
        $links.each((_i, link) => {
          expect(link, 'href').to.have.attr('href', '/plants/pl-monstera');
        });
      });
    });

    it('PC-04: links use plant id pl-snake', { tags: '@component' }, () => {
      mountWithSave({ ...defaultPlant, id: 'pl-snake', name: 'Snake Plant' });

      cy.findAllByRole('link', { name: 'Snake Plant' }).then(($links) => {
        expect($links, 'link count').to.have.length(2);
        $links.each((_i, link) => {
          expect(link, 'href').to.have.attr('href', '/plants/pl-snake');
        });
      });
    });

    it('PC-05: price shows $24.50', { tags: ['@component', '@known-bug'] }, () => {
      mountWithSave();

      cy.findByText('$24.50').should('be.visible');
    });

    it('PC-08: rating 4.7 and out of 5', { tags: '@component' }, () => {
      mountWithSave();

      cy.findByRole('article').within(() => {
        cy.findByText('4.7').should('be.visible');
        cy.findByText('out of 5', { includeHidden: true });
      });
    });

    it('PC-17: Easy care', { tags: '@component' }, () => {
      mountWithSave();

      cy.findByText('Easy care').should('be.visible');
    });

    it('PC-18: Moderate care', { tags: '@component' }, () => {
      mountWithSave({ ...defaultPlant, careLevel: 2 });

      cy.findByText('Moderate care').should('be.visible');
    });

    it('PC-19: Expert care', { tags: ['@component', '@known-bug'] }, () => {
      mountWithSave({ ...defaultPlant, careLevel: 3 });

      cy.findByText('Expert care').should('be.visible');
    });

    it('PC-20: Pet safe', { tags: '@component' }, () => {
      mountWithSave({ ...defaultPlant, petSafe: true });

      cy.findByText('Pet safe').should('be.visible');
    });

    it('PC-21: Not pet safe', { tags: '@component' }, () => {
      mountWithSave();

      cy.findByText('Not pet safe').should('be.visible');
    });
  });

  describe('boundary', () => {
    it('PC-06: whole-dollar price $22.00', { tags: ['@component', '@known-bug'] }, () => {
      mountWithSave({ ...defaultPlant, price: 22 });

      cy.findByText('$22.00').should('be.visible');
    });

    it('PC-07: zero price $0.00', { tags: ['@component', '@known-bug'] }, () => {
      mountWithSave({ ...defaultPlant, price: 0 });

      cy.findByText('$0.00').should('be.visible');
    });

    it('PC-09: rating 0.0 and out of 5', { tags: '@component' }, () => {
      mountWithSave({ ...defaultPlant, rating: 0 });

      cy.findByRole('article').within(() => {
        cy.findByText('0.0').should('be.visible');
        cy.findByText('out of 5', { includeHidden: true });
      });
    });

    it('PC-10: rating 5.0 and out of 5', { tags: '@component' }, () => {
      mountWithSave({ ...defaultPlant, rating: 5 });

      cy.findByRole('article').within(() => {
        cy.findByText('5.0').should('be.visible');
        cy.findByText('out of 5', { includeHidden: true });
      });
    });

    it('PC-12: no Out of stock when stock is 1', { tags: '@component' }, () => {
      mountWithSave({ ...defaultPlant, stock: 1 });

      cy.findByText('Out of stock').should('not.exist');
    });

    it('PC-22: long name in heading and link', { tags: '@component' }, () => {
      mountWithSave({ ...defaultPlant, name: LONG_NAME });

      cy.findByRole('heading', { level: 3, name: LONG_NAME });
      cy.findAllByRole('link', { name: LONG_NAME }).should('have.length', 2);
    });
  });

  describe('state', () => {
    it('PC-11: Out of stock when stock is 0', { tags: '@component' }, () => {
      mountWithSave({ ...defaultPlant, stock: 0 });

      cy.findByText('Out of stock').should('be.visible');
    });

    it('PC-14: save button present, not pressed', { tags: '@component' }, () => {
      mountWithSave();

      saveButton().then(($btn) => {
        expect($btn, 'aria-pressed').to.have.attr('aria-pressed', 'false');
      });
    });

    it('PC-15: save button pressed when saved', { tags: '@component' }, () => {
      mountWithSave(defaultPlant, { saved: true });

      saveButton().then(($btn) => {
        expect($btn, 'aria-pressed').to.have.attr('aria-pressed', 'true');
      });
    });
  });

  describe('interaction', () => {
    it('PC-16: click save calls onToggleSave with plant id', { tags: '@component' }, () => {
      const onToggleSave = cy.spy().as('onToggleSave');
      mountWithSave(defaultPlant, { saved: false, onToggleSave });

      saveButton().click();

      cy.get('@onToggleSave').should('have.been.calledOnceWithExactly', 'pl-monstera');
      saveButton().then(($btn) => {
        expect($btn, 'aria-pressed after click').to.have.attr('aria-pressed', 'false');
      });
    });
  });

  describe('accessibility', () => {
    it('PC-13: no buttons when onToggleSave omitted', { tags: '@component' }, () => {
      cy.mount(<PlantCard plant={defaultPlant} />);

      cy.findAllByRole('button').should('have.length', 0);
    });

    it('PC-23: save button has a name when unsaved', { tags: ['@component', '@known-bug'] }, () => {
      mountWithSave(defaultPlant, { saved: false });

      cy.findByRole('button', { name: /./ }).should('exist');
    });

    it('PC-24: save button has a name when saved', { tags: ['@component', '@known-bug'] }, () => {
      mountWithSave(defaultPlant, { saved: true });

      cy.findByRole('button', { name: /./ }).should('exist');
    });

    it('PC-25: exactly one button when save is shown', { tags: '@component' }, () => {
      mountWithSave();

      cy.findAllByRole('button').should('have.length', 1);
    });

    it('PC-26: keyboard activates save', { tags: '@component' }, () => {
      const onToggleSave = cy.spy().as('onToggleSave');
      mountWithSave(defaultPlant, { saved: false, onToggleSave });

      saveButton().type('{enter}');

      cy.get('@onToggleSave').should('have.been.calledWith', 'pl-monstera');
    });
  });
});
