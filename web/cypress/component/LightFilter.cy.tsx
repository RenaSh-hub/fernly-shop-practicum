import { LightFilter } from '../../src/components/LightFilter';

function lightGroup() {
  return cy.findByRole('group', { name: 'Light' });
}

function lightCheckbox(name: string) {
  return cy.findByRole('checkbox', { name });
}

function checkboxLabel($checkbox: JQuery<HTMLElement>) {
  return $checkbox.closest('label').text().trim();
}

describe('LightFilter', () => {
  describe('render', () => {
    it(
      'LF-01: group Light lists Low, Medium, Bright light in order',
      { tags: '@component' },
      () => {
        cy.mount(<LightFilter value={[]} onChange={cy.spy()} />);

        lightGroup().within(() => {
          cy.findAllByRole('checkbox').then(($boxes) => {
            const labels = [...$boxes].map((box) => checkboxLabel(Cypress.$(box)));
            expect(labels, 'checkbox labels in order').to.deep.equal([
              'Low light',
              'Medium light',
              'Bright light',
            ]);
          });
        });
      },
    );
  });

  describe('state', () => {
    it('LF-02: none of the three checkboxes are checked', { tags: '@component' }, () => {
      cy.mount(<LightFilter value={[]} onChange={cy.spy()} />);

      lightCheckbox('Low light').then(($el) => {
        expect($el, 'Low light unchecked').not.to.be.checked;
      });
      lightCheckbox('Medium light').then(($el) => {
        expect($el, 'Medium light unchecked').not.to.be.checked;
      });
      lightCheckbox('Bright light').then(($el) => {
        expect($el, 'Bright light unchecked').not.to.be.checked;
      });
    });

    it('LF-03: Low light checked; Medium and Bright not', { tags: '@component' }, () => {
      cy.mount(<LightFilter value={['low']} onChange={cy.spy()} />);

      lightCheckbox('Low light').then(($el) => {
        expect($el, 'Low light checked').to.be.checked;
      });
      lightCheckbox('Medium light').then(($el) => {
        expect($el, 'Medium light unchecked').not.to.be.checked;
      });
      lightCheckbox('Bright light').then(($el) => {
        expect($el, 'Bright light unchecked').not.to.be.checked;
      });
    });

    it('LF-04: Medium light checked; Low and Bright not', { tags: '@component' }, () => {
      cy.mount(<LightFilter value={['medium']} onChange={cy.spy()} />);

      lightCheckbox('Medium light').then(($el) => {
        expect($el, 'Medium light checked').to.be.checked;
      });
      lightCheckbox('Low light').then(($el) => {
        expect($el, 'Low light unchecked').not.to.be.checked;
      });
      lightCheckbox('Bright light').then(($el) => {
        expect($el, 'Bright light unchecked').not.to.be.checked;
      });
    });

    it('LF-05: Bright light checked; Low and Medium not', { tags: '@component' }, () => {
      cy.mount(<LightFilter value={['bright']} onChange={cy.spy()} />);

      lightCheckbox('Bright light').then(($el) => {
        expect($el, 'Bright light checked').to.be.checked;
      });
      lightCheckbox('Low light').then(($el) => {
        expect($el, 'Low light unchecked').not.to.be.checked;
      });
      lightCheckbox('Medium light').then(($el) => {
        expect($el, 'Medium light unchecked').not.to.be.checked;
      });
    });

    it('LF-06: Low and Bright checked; Medium not', { tags: '@component' }, () => {
      cy.mount(<LightFilter value={['low', 'bright']} onChange={cy.spy()} />);

      lightCheckbox('Low light').then(($el) => {
        expect($el, 'Low light checked').to.be.checked;
      });
      lightCheckbox('Bright light').then(($el) => {
        expect($el, 'Bright light checked').to.be.checked;
      });
      lightCheckbox('Medium light').then(($el) => {
        expect($el, 'Medium light unchecked').not.to.be.checked;
      });
    });

    it('LF-07: Low and Medium checked; Bright not', { tags: '@component' }, () => {
      cy.mount(<LightFilter value={['low', 'medium']} onChange={cy.spy()} />);

      lightCheckbox('Low light').then(($el) => {
        expect($el, 'Low light checked').to.be.checked;
      });
      lightCheckbox('Medium light').then(($el) => {
        expect($el, 'Medium light checked').to.be.checked;
      });
      lightCheckbox('Bright light').then(($el) => {
        expect($el, 'Bright light unchecked').not.to.be.checked;
      });
    });

    it('LF-08: Medium and Bright checked; Low not', { tags: '@component' }, () => {
      cy.mount(<LightFilter value={['medium', 'bright']} onChange={cy.spy()} />);

      lightCheckbox('Medium light').then(($el) => {
        expect($el, 'Medium light checked').to.be.checked;
      });
      lightCheckbox('Bright light').then(($el) => {
        expect($el, 'Bright light checked').to.be.checked;
      });
      lightCheckbox('Low light').then(($el) => {
        expect($el, 'Low light unchecked').not.to.be.checked;
      });
    });

    it('LF-09: all three checkboxes are checked', { tags: '@component' }, () => {
      cy.mount(
        <LightFilter value={['low', 'medium', 'bright']} onChange={cy.spy()} />,
      );

      lightCheckbox('Low light').then(($el) => {
        expect($el, 'Low light checked').to.be.checked;
      });
      lightCheckbox('Medium light').then(($el) => {
        expect($el, 'Medium light checked').to.be.checked;
      });
      lightCheckbox('Bright light').then(($el) => {
        expect($el, 'Bright light checked').to.be.checked;
      });
    });
  });

  describe('boundary', () => {
    it('LF-10: exactly three checkboxes', { tags: '@component' }, () => {
      cy.mount(<LightFilter value={[]} onChange={cy.spy()} />);

      cy.findAllByRole('checkbox').then(($boxes) => {
        expect($boxes, 'checkbox count').to.have.length(3);
      });
    });

    it('LF-11: Low light is first; Bright light is last', { tags: '@component' }, () => {
      cy.mount(<LightFilter value={[]} onChange={cy.spy()} />);

      cy.findAllByRole('checkbox')
        .first()
        .then(($box) => {
          expect(checkboxLabel($box), 'first checkbox').to.equal('Low light');
        });
      cy.findAllByRole('checkbox')
        .last()
        .then(($box) => {
          expect(checkboxLabel($box), 'last checkbox').to.equal('Bright light');
        });
    });
  });

  describe('interaction', () => {
    it(
      'LF-12: onChange once with low; Low light stays unchecked',
      { tags: '@component' },
      () => {
        const onChange = cy.spy().as('onChange');
        cy.mount(<LightFilter value={[]} onChange={onChange} />);

        lightCheckbox('Low light').click();

        cy.get('@onChange').should('have.been.calledOnceWithExactly', ['low']);
        lightCheckbox('Low light').then(($el) => {
          expect($el, 'controlled value unchanged').not.to.be.checked;
        });
      },
    );

    it('LF-13: onChange once with low and bright', { tags: '@component' }, () => {
      const onChange = cy.spy().as('onChange');
      cy.mount(<LightFilter value={['low']} onChange={onChange} />);

      lightCheckbox('Bright light').click();

      cy.get('@onChange').should('have.been.calledOnceWithExactly', ['low', 'bright']);
    });

    it('LF-14: onChange once with empty array', { tags: '@component' }, () => {
      const onChange = cy.spy().as('onChange');
      cy.mount(<LightFilter value={['medium']} onChange={onChange} />);

      lightCheckbox('Medium light').click();

      cy.get('@onChange').should('have.been.calledOnceWithExactly', []);
    });

    it('LF-15: onChange once with bright only', { tags: '@component' }, () => {
      const onChange = cy.spy().as('onChange');
      cy.mount(<LightFilter value={['low', 'bright']} onChange={onChange} />);

      lightCheckbox('Low light').click();

      cy.get('@onChange').should('have.been.calledOnceWithExactly', ['bright']);
    });
  });

  describe('accessibility', () => {
    it('LF-16: control is a group named Light', { tags: '@component' }, () => {
      cy.mount(<LightFilter value={[]} onChange={cy.spy()} />);

      lightGroup().should('exist');
    });

    it('LF-17: checkboxes named Low, Medium, and Bright light', { tags: '@component' }, () => {
      cy.mount(<LightFilter value={[]} onChange={cy.spy()} />);

      lightCheckbox('Low light').should('exist');
      lightCheckbox('Medium light').should('exist');
      lightCheckbox('Bright light').should('exist');
    });

    it('LF-18: there are no buttons in the component', { tags: '@component' }, () => {
      cy.mount(<LightFilter value={[]} onChange={cy.spy()} />);

      cy.findAllByRole('button').should('have.length', 0);
    });

    it('LF-19: keyboard toggle calls onChange with low', { tags: '@component' }, () => {
      const onChange = cy.spy().as('onChange');
      cy.mount(<LightFilter value={[]} onChange={onChange} />);

      lightCheckbox('Low light').focus().should('have.focus');
      lightCheckbox('Low light').check({ force: true });

      cy.get('@onChange').should('have.been.calledWith', ['low']);
    });
  });
});
