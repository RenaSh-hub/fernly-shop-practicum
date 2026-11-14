import { SortSelect } from '../../src/components/SortSelect';

function sortSelect() {
  return cy.findByRole('combobox', { name: 'Sort by' });
}

describe('SortSelect', () => {
  describe('render', () => {
    it(
      'SS-01: lists Featured, Price low/high, Name A–Z, Best rated in order',
      { tags: '@component' },
      () => {
        cy.mount(<SortSelect value="featured" onChange={cy.spy()} />);

        sortSelect()
          .find('option')
          .then(($options) => {
            const labels = [...$options].map((option) => option.textContent?.trim());
            expect(labels, 'option labels in order').to.deep.equal([
              'Featured',
              'Price: low to high',
              'Price: high to low',
              'Name: A to Z',
              'Best rated',
            ]);
          });
      },
    );
  });

  describe('state', () => {
    it('SS-02: Featured is the selected option', { tags: '@component' }, () => {
      cy.mount(<SortSelect value="featured" onChange={cy.spy()} />);

      sortSelect().then(($select) => {
        expect($select, 'selected sort').to.have.value('featured');
      });
    });

    it('SS-03: Price: low to high is the selected option', { tags: '@component' }, () => {
      cy.mount(<SortSelect value="price-asc" onChange={cy.spy()} />);

      sortSelect().then(($select) => {
        expect($select, 'selected sort').to.have.value('price-asc');
      });
    });

    it('SS-04: Price: high to low is the selected option', { tags: '@component' }, () => {
      cy.mount(<SortSelect value="price-desc" onChange={cy.spy()} />);

      sortSelect().then(($select) => {
        expect($select, 'selected sort').to.have.value('price-desc');
      });
    });

    it('SS-05: Name: A to Z is the selected option', { tags: '@component' }, () => {
      cy.mount(<SortSelect value="name" onChange={cy.spy()} />);

      sortSelect().then(($select) => {
        expect($select, 'selected sort').to.have.value('name');
      });
    });

    it('SS-06: Best rated is the selected option', { tags: '@component' }, () => {
      cy.mount(<SortSelect value="rating" onChange={cy.spy()} />);

      sortSelect().then(($select) => {
        expect($select, 'selected sort').to.have.value('rating');
      });
    });
  });

  describe('boundary', () => {
    it('SS-07: Featured is the first listed option', { tags: '@component' }, () => {
      cy.mount(<SortSelect value="featured" onChange={cy.spy()} />);

      sortSelect()
        .find('option')
        .first()
        .then(($option) => {
          expect($option.text().trim(), 'first option label').to.equal('Featured');
        });
    });

    it('SS-08: Best rated is the last listed option', { tags: '@component' }, () => {
      cy.mount(<SortSelect value="rating" onChange={cy.spy()} />);

      sortSelect()
        .find('option')
        .last()
        .then(($option) => {
          expect($option.text().trim(), 'last option label').to.equal('Best rated');
        });
    });

    it('SS-09: exposes exactly five options', { tags: '@component' }, () => {
      cy.mount(<SortSelect value="featured" onChange={cy.spy()} />);

      sortSelect()
        .find('option')
        .then(($options) => {
          expect($options, 'option count').to.have.length(5);
        });
    });
  });

  describe('interaction', () => {
    it(
      'SS-10: onChange price-asc once; display stays Featured',
      { tags: '@component' },
      () => {
        const onChange = cy.spy().as('onChange');
        cy.mount(<SortSelect value="featured" onChange={onChange} />);

        sortSelect().select('Price: low to high');

        cy.get('@onChange').should('have.been.calledOnceWithExactly', 'price-asc');
        sortSelect().then(($select) => {
          expect($select, 'controlled value unchanged').to.have.value('featured');
        });
      },
    );

    it('SS-11: onChange called once with featured', { tags: '@component' }, () => {
      const onChange = cy.spy().as('onChange');
      cy.mount(<SortSelect value="price-asc" onChange={onChange} />);

      sortSelect().select('Featured');

      cy.get('@onChange').should('have.been.calledOnceWithExactly', 'featured');
    });
  });

  describe('accessibility', () => {
    it('SS-12: sort control is a combobox named Sort by', { tags: '@component' }, () => {
      cy.mount(<SortSelect value="featured" onChange={cy.spy()} />);

      sortSelect().should('exist');
    });

    it('SS-13: there are no buttons in the component', { tags: '@component' }, () => {
      cy.mount(<SortSelect value="featured" onChange={cy.spy()} />);

      cy.findAllByRole('button').should('have.length', 0);
    });

    it('SS-14: keyboard choice calls onChange with name', { tags: '@component' }, () => {
      const onChange = cy.spy().as('onChange');
      cy.mount(<SortSelect value="featured" onChange={onChange} />);

      sortSelect().focus().should('have.focus').select('name');

      cy.get('@onChange').should('have.been.calledWith', 'name');
    });
  });
});
