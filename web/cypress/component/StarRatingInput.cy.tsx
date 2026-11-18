import { useState } from 'react';
import { StarRatingInput } from '../../src/components/StarRatingInput';

/** #d39b1c — filled star color from StarRatingInput.module.css */
const FILLED_STAR_RGB = 'rgb(211, 155, 28)';

function ratingGroup() {
  return cy.findByRole('radiogroup', { name: 'Your rating' });
}

function starRadio(name: string) {
  return cy.findByRole('radio', { name });
}

function expectChecked(
  chain: Cypress.Chainable<JQuery<HTMLElement>>,
  label: string,
  checked: boolean,
) {
  chain.then(($el) => {
    if (checked) {
      expect($el, label).to.have.attr('aria-checked', 'true');
    } else {
      const aria = $el.attr('aria-checked');
      expect(aria === 'false' || aria === undefined, label).to.equal(true);
    }
  });
}

function expectFilled(
  chain: Cypress.Chainable<JQuery<HTMLElement>>,
  label: string,
) {
  chain.then(($el) => {
    expect(getComputedStyle($el[0]).color, label).to.equal(FILLED_STAR_RGB);
  });
}

/** Controlled harness so a click can update value while still spying onChange. */
function RatingHarness({
  initial,
  onChange,
}: {
  initial: number;
  onChange: (value: number) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <StarRatingInput
      value={value}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
}

describe('StarRatingInput', () => {
  describe('interaction', () => {
    it('PR-07-01: onChange 3 and three filled stars', { tags: '@component' }, () => {
      const onChange = cy.spy().as('onChange');
      cy.mount(<RatingHarness initial={0} onChange={onChange} />);

      starRadio('3 stars').click();

      cy.get('@onChange').should('have.been.calledOnceWithExactly', 3);
      expectFilled(starRadio('1 star'), '1 star filled');
      expectFilled(starRadio('2 stars'), '2 stars filled');
      expectFilled(starRadio('3 stars'), '3 stars filled');
    });

    it('PR-07-02: onChange called with 1', { tags: '@component' }, () => {
      const onChange = cy.spy().as('onChange');
      cy.mount(<StarRatingInput value={0} onChange={onChange} />);

      starRadio('1 star').click();

      cy.get('@onChange').should('have.been.calledOnceWithExactly', 1);
    });

    it('PR-07-03: onChange called with 5', { tags: '@component' }, () => {
      const onChange = cy.spy().as('onChange');
      cy.mount(<StarRatingInput value={0} onChange={onChange} />);

      starRadio('5 stars').click();

      cy.get('@onChange').should('have.been.calledOnceWithExactly', 5);
    });
  });

  describe('render', () => {
    it('PR-07-04: radiogroup Your rating; none checked at 0', { tags: '@component' }, () => {
      cy.mount(<StarRatingInput value={0} onChange={cy.spy()} />);

      ratingGroup().should('exist');
      cy.findAllByRole('radio').each(($radio) => {
        expectChecked(cy.wrap($radio), 'star unchecked at value 0', false);
      });
      cy.findByRole('radio', { checked: true }).should('not.exist');
    });
  });

  describe('accessibility', () => {
    it(
      'PR-07-05: radiogroup Your rating; five radios; 3 stars checked',
      { tags: '@component' },
      () => {
        cy.mount(<StarRatingInput value={3} onChange={cy.spy()} />);

        ratingGroup().should('exist');
        starRadio('1 star').should('exist');
        starRadio('2 stars').should('exist');
        starRadio('3 stars').should('exist');
        starRadio('4 stars').should('exist');
        starRadio('5 stars').should('exist');
        cy.findAllByRole('radio').then(($radios) => {
          expect($radios, 'five star radios').to.have.length(5);
        });

        expectChecked(starRadio('3 stars'), '3 stars checked', true);
        expectChecked(starRadio('1 star'), '1 star not checked', false);
        expectChecked(starRadio('2 stars'), '2 stars not checked', false);
        expectChecked(starRadio('4 stars'), '4 stars not checked', false);
        expectChecked(starRadio('5 stars'), '5 stars not checked', false);
      },
    );

    it(
      'PR-07-06: Tab into group; arrows raise rating via onChange',
      { tags: '@component' },
      () => {
        const onChange = cy.spy().as('onChange');
        cy.mount(
          <div>
            <button type="button">Before rating</button>
            <StarRatingInput value={0} onChange={onChange} />
          </div>,
        );

        ratingGroup().within(() => {
          cy.findAllByRole('radio').then(($radios) => {
            const focusable = [...$radios].filter((el) => {
              const tabIndex = el.getAttribute('tabindex');
              return tabIndex !== null && Number(tabIndex) >= 0;
            });
            expect(focusable, 'focusable star radios for Tab into group').to.have.length.of.at.least(
              1,
            );
            focusable[0].focus();
          });
        });

        cy.focused().should('have.attr', 'role', 'radio');
        cy.focused().trigger('keydown', { key: 'ArrowRight' });

        cy.get('@onChange').should('have.been.calledWith', 2);

        cy.focused().then(($el) => {
          expect($el.attr('aria-label'), 'focus moved among stars').to.equal('2 stars');
        });
      },
    );
  });
});
