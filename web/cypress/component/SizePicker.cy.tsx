import { SizePicker } from '../../src/components/SizePicker';
import type { SizeLabel } from '../../src/types';

const threeSizes: { label: SizeLabel; priceDelta: number }[] = [
  { label: 'S', priceDelta: 0 },
  { label: 'M', priceDelta: 6 },
  { label: 'L', priceDelta: 14 },
];

function sizeGroup() {
  return cy.findByRole('group', { name: 'Size' });
}

function radio(name: RegExp) {
  return cy.findByRole('radio', { name });
}

/** Native inputs are visually hidden; customers activate the card (label). */
function chooseRadio(name: RegExp) {
  radio(name).closest('label').click();
}

describe('SizePicker', () => {
  describe('render', () => {
    it('SP-01: legend Size and radios for Small, Medium, Large', { tags: '@component' }, () => {
      cy.mount(<SizePicker sizes={threeSizes} value="S" onChange={cy.spy()} />);

      sizeGroup().should('exist');
      radio(/Small/i).should('exist');
      radio(/Medium/i).should('exist');
      radio(/Large/i).should('exist');
    });

    it('SP-05: Small option includes Base price', { tags: '@component' }, () => {
      cy.mount(<SizePicker sizes={threeSizes} value="S" onChange={cy.spy()} />);

      radio(/Small.*Base price/i).should('exist');
    });

    it('SP-06: Medium with priceDelta 0 shows Base price', { tags: '@component' }, () => {
      cy.mount(
        <SizePicker sizes={[{ label: 'M', priceDelta: 0 }]} value="M" onChange={cy.spy()} />,
      );

      radio(/Medium.*Base price/i).should('exist');
    });

    it('SP-07: Medium option includes +$6.00', { tags: '@component' }, () => {
      cy.mount(<SizePicker sizes={threeSizes} value="M" onChange={cy.spy()} />);

      radio(/Medium.*\+\$6\.00/).should('exist');
    });

    it('SP-08: Large option includes +$14.00', { tags: '@component' }, () => {
      cy.mount(<SizePicker sizes={threeSizes} value="L" onChange={cy.spy()} />);

      radio(/Large.*\+\$14\.00/).should('exist');
    });

    it('SP-20: default name groups radios as size', { tags: '@component' }, () => {
      cy.mount(<SizePicker sizes={threeSizes} value="S" onChange={cy.spy()} />);

      cy.findAllByRole('radio').each(($radio) => {
        expect($radio, 'radio group name').to.have.attr('name', 'size');
      });
    });

    it('SP-21: custom name groups radios as plant-size', { tags: '@component' }, () => {
      cy.mount(
        <SizePicker
          sizes={threeSizes}
          value="S"
          name="plant-size"
          onChange={cy.spy()}
        />,
      );

      cy.findAllByRole('radio').each(($radio) => {
        expect($radio, 'radio group name').to.have.attr('name', 'plant-size');
      });
    });
  });

  describe('state', () => {
    it('SP-02: Small is checked; Medium and Large are not', { tags: '@component' }, () => {
      cy.mount(<SizePicker sizes={threeSizes} value="S" onChange={cy.spy()} />);

      radio(/Small/i).then(($el) => {
        expect($el, 'Small checked').to.be.checked;
      });
      radio(/Medium/i).then(($el) => {
        expect($el, 'Medium unchecked').not.to.be.checked;
      });
      radio(/Large/i).then(($el) => {
        expect($el, 'Large unchecked').not.to.be.checked;
      });
    });

    it('SP-03: Medium is checked; Small and Large are not', { tags: '@component' }, () => {
      cy.mount(<SizePicker sizes={threeSizes} value="M" onChange={cy.spy()} />);

      radio(/Medium/i).then(($el) => {
        expect($el, 'Medium checked').to.be.checked;
      });
      radio(/Small/i).then(($el) => {
        expect($el, 'Small unchecked').not.to.be.checked;
      });
      radio(/Large/i).then(($el) => {
        expect($el, 'Large unchecked').not.to.be.checked;
      });
    });

    it('SP-04: Large is checked; Small and Medium are not', { tags: '@component' }, () => {
      cy.mount(<SizePicker sizes={threeSizes} value="L" onChange={cy.spy()} />);

      radio(/Large/i).then(($el) => {
        expect($el, 'Large checked').to.be.checked;
      });
      radio(/Small/i).then(($el) => {
        expect($el, 'Small unchecked').not.to.be.checked;
      });
      radio(/Medium/i).then(($el) => {
        expect($el, 'Medium unchecked').not.to.be.checked;
      });
    });
  });

  describe('boundary', () => {
    it('SP-09: smallest positive priceDelta shows +$0.01', { tags: '@component' }, () => {
      cy.mount(
        <SizePicker sizes={[{ label: 'M', priceDelta: 0.01 }]} value="M" onChange={cy.spy()} />,
      );

      radio(/Medium.*\+\$0\.01/).should('exist');
    });

    it('SP-10: exactly three size radios', { tags: '@component' }, () => {
      cy.mount(<SizePicker sizes={threeSizes} value="S" onChange={cy.spy()} />);

      cy.findAllByRole('radio').then(($radios) => {
        expect($radios, 'radio count').to.have.length(3);
      });
    });

    it('SP-11: exactly two radios (Small, Medium); no Large', { tags: '@component' }, () => {
      cy.mount(
        <SizePicker
          sizes={[
            { label: 'S', priceDelta: 0 },
            { label: 'M', priceDelta: 4 },
          ]}
          value="S"
          onChange={cy.spy()}
        />,
      );

      cy.findAllByRole('radio').then(($radios) => {
        expect($radios, 'radio count').to.have.length(2);
      });
      radio(/Small/i).should('exist');
      radio(/Medium/i).should('exist');
      cy.findByRole('radio', { name: /Large/i }).should('not.exist');
    });

    it('SP-12: exactly one radio (Small)', { tags: '@component' }, () => {
      cy.mount(
        <SizePicker sizes={[{ label: 'S', priceDelta: 0 }]} value="S" onChange={cy.spy()} />,
      );

      cy.findAllByRole('radio').then(($radios) => {
        expect($radios, 'radio count').to.have.length(1);
      });
      radio(/Small/i).should('exist');
    });

    it('SP-13: Small is first radio; Large is last', { tags: '@component' }, () => {
      cy.mount(<SizePicker sizes={threeSizes} value="S" onChange={cy.spy()} />);

      cy.findAllByRole('radio')
        .first()
        .then(($radio) => {
          expect($radio.attr('value'), 'first radio value').to.equal('S');
        });
      cy.findAllByRole('radio')
        .last()
        .then(($radio) => {
          expect($radio.attr('value'), 'last radio value').to.equal('L');
        });
    });
  });

  describe('interaction', () => {
    it(
      'SP-14: onChange M once; Small stays checked until parent updates',
      { tags: '@component' },
      () => {
        const onChange = cy.spy().as('onChange');
        cy.mount(<SizePicker sizes={threeSizes} value="S" onChange={onChange} />);

        chooseRadio(/Medium/i);

        cy.get('@onChange').should('have.been.calledOnceWithExactly', 'M');
        radio(/Small/i).then(($el) => {
          expect($el, 'controlled value unchanged').to.be.checked;
        });
        radio(/Medium/i).then(($el) => {
          expect($el, 'Medium not checked yet').not.to.be.checked;
        });
      },
    );

    it('SP-15: onChange called once with S', { tags: '@component' }, () => {
      const onChange = cy.spy().as('onChange');
      cy.mount(<SizePicker sizes={threeSizes} value="M" onChange={onChange} />);

      chooseRadio(/Small/i);

      cy.get('@onChange').should('have.been.calledOnceWithExactly', 'S');
    });
  });

  describe('accessibility', () => {
    it('SP-16: size control is a group named Size', { tags: '@component' }, () => {
      cy.mount(<SizePicker sizes={threeSizes} value="S" onChange={cy.spy()} />);

      sizeGroup().should('exist');
    });

    it(
      'SP-17: each radio name includes long label and price line',
      { tags: '@component' },
      () => {
        cy.mount(<SizePicker sizes={threeSizes} value="S" onChange={cy.spy()} />);

        radio(/Small.*Base price/i).should('exist');
        radio(/Medium.*\+\$6\.00/).should('exist');
        radio(/Large.*\+\$14\.00/).should('exist');
      },
    );

    it('SP-18: there are no buttons in the component', { tags: '@component' }, () => {
      cy.mount(<SizePicker sizes={threeSizes} value="S" onChange={cy.spy()} />);

      cy.findAllByRole('button').should('have.length', 0);
    });

    it('SP-19: keyboard activation calls onChange with M', { tags: '@component' }, () => {
      const onChange = cy.spy().as('onChange');
      cy.mount(<SizePicker sizes={threeSizes} value="S" onChange={onChange} />);

      radio(/Medium/i).focus().should('have.focus');
      radio(/Medium/i).check({ force: true });

      cy.get('@onChange').should('have.been.calledWith', 'M');
    });
  });
});
