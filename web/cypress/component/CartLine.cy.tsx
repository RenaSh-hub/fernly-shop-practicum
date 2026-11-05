import { CartLine } from '../../src/components/CartLine';
import type { CartLine as CartLineData } from '../../src/types';

const defaultLine: CartLineData = {
  id: 'ln-1a2b3c4d',
  plantId: 'pl-monstera',
  name: 'Monstera Deliciosa',
  size: 'M',
  unitPrice: 30.5,
  quantity: 2,
  lineTotal: 61,
  stock: 12,
  imageUrl: '/plants/monstera.svg',
};

const LONG_NAME =
  'Supercalifragilisticexpialidocious Window Fern With An Exceptionally Long Common Name That Must Wrap In The Cart Line';

function mountCartLine(
  line: CartLineData = defaultLine,
  options?: { busy?: boolean; onQuantityChange?: (lineId: string, quantity: number) => void; onRemove?: (lineId: string) => void },
) {
  const onQuantityChange = options?.onQuantityChange ?? cy.spy().as('onQuantityChange');
  const onRemove = options?.onRemove ?? cy.spy().as('onRemove');
  const busy = options?.busy;

  if (busy === undefined) {
    cy.mount(
      <ul>
        <CartLine line={line} onQuantityChange={onQuantityChange} onRemove={onRemove} />
      </ul>,
    );
  } else {
    cy.mount(
      <ul>
        <CartLine line={line} busy={busy} onQuantityChange={onQuantityChange} onRemove={onRemove} />
      </ul>,
    );
  }

  return { onQuantityChange, onRemove };
}

function increaseButton() {
  return cy.findByRole('button', { name: 'Increase quantity' });
}

function decreaseButton() {
  return cy.findByRole('button', { name: 'Decrease quantity' });
}

function removeButton(name = 'Monstera Deliciosa') {
  return cy.findByRole('button', { name: `Remove ${name}` });
}

function quantityGroup(name = 'Monstera Deliciosa') {
  return cy.findByRole('group', { name: `Quantity of ${name}` });
}

describe('CartLine', () => {
  describe('render', () => {
    it('CL-01: visible Monstera Deliciosa and Size M', { tags: '@component' }, () => {
      mountCartLine();

      cy.findByText('Monstera Deliciosa');
      cy.findByText(/Size M/);
    });

    it('CL-02: visible Size S', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, size: 'S' });

      cy.findByText(/Size S/);
    });

    it('CL-03: visible Size L', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, size: 'L' });

      cy.findByText(/Size L/);
    });

    it('CL-04: image src /plants/snake.svg', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, imageUrl: '/plants/snake.svg' });

      cy.findByRole('listitem').find('img').should('have.attr', 'src', '/plants/snake.svg');
    });

    it('CL-05: unit price $30.50 and each', { tags: '@component' }, () => {
      mountCartLine();

      cy.findByText(/\$30\.50/);
      cy.findByText(/each/);
    });

    it('CL-06: unit price $0.99', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, unitPrice: 0.99 });

      cy.findByText('$0.99');
    });

    it('CL-07: line total $61.00', { tags: '@component' }, () => {
      mountCartLine();

      cy.findByText('$61.00');
    });

    it('CL-08: $24.50 each and $99.00 line total', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, unitPrice: 24.5, lineTotal: 99 });

      cy.findByText('$24.50');
      cy.findByText('$99.00');
    });

    it('CL-10: quantity output shows 2', { tags: '@component' }, () => {
      mountCartLine();

      quantityGroup().within(() => {
        cy.findByText('2');
      });
    });

    it('CL-34: Snake Plant name in copy and accessible names', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, name: 'Snake Plant' });

      cy.findByText('Snake Plant');
      cy.findByRole('button', { name: 'Remove Snake Plant' });
      cy.findByRole('group', { name: 'Quantity of Snake Plant' });
    });
  });

  describe('boundary', () => {
    it('CL-09: zero money shows $0.00', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, unitPrice: 0, lineTotal: 0 });

      cy.findByText('Line total:').then(($label) => {
        expect($label.parent(), 'line total price').to.contain.text('$0.00');
      });
      cy.findByText('Price each:').then(($label) => {
        expect($label.parent(), 'unit price').to.contain.text('$0.00');
      });
    });

    it('CL-11: at minimum quantity 1, − disabled and + enabled', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, quantity: 1 });

      quantityGroup().within(() => {
        cy.findByText('1');
      });
      decreaseButton().then(($btn) => {
        expect($btn, '− at min').to.be.disabled;
      });
      increaseButton().then(($btn) => {
        expect($btn, '+ below stock').not.to.be.disabled;
      });
    });

    it('CL-12: + disabled at stock limit', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, quantity: 3, stock: 3 });

      increaseButton().then(($btn) => {
        expect($btn, '+ at stock limit').to.be.disabled;
      });
    });

    it('CL-13: + enabled one below stock', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, quantity: 2, stock: 3 });

      increaseButton().then(($btn) => {
        expect($btn, '+ one below stock').not.to.be.disabled;
      });
    });

    it('CL-14: quantity and stock both 1 — stepper disabled, Remove enabled', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, quantity: 1, stock: 1 });

      decreaseButton().then(($btn) => {
        expect($btn, '− at min').to.be.disabled;
      });
      increaseButton().then(($btn) => {
        expect($btn, '+ at stock limit').to.be.disabled;
      });
      removeButton().then(($btn) => {
        expect($btn, 'Remove when not busy').not.to.be.disabled;
      });
    });

    it('CL-15: quantity 20 at stock 20 — output 20 and + disabled', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, quantity: 20, stock: 20 });

      quantityGroup().within(() => {
        cy.findByText('20');
      });
      increaseButton().then(($btn) => {
        expect($btn, '+ at stock 20').to.be.disabled;
      });
    });

    it('CL-16: stock 0 with quantity 1 — stepper disabled', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, quantity: 1, stock: 0 });

      increaseButton().then(($btn) => {
        expect($btn, '+ when stock 0').to.be.disabled;
      });
      decreaseButton().then(($btn) => {
        expect($btn, '− at min with stock 0').to.be.disabled;
      });
    });

    it('CL-38: long name in visible text, Remove, and Quantity group', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, name: LONG_NAME });

      cy.findByText(LONG_NAME);
      cy.findByRole('button', { name: `Remove ${LONG_NAME}` });
      cy.findByRole('group', { name: `Quantity of ${LONG_NAME}` });
    });

    it('CL-39: extreme money formatted with two decimals', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, unitPrice: 999999.99, lineTotal: 999999.99 });

      cy.findAllByText('$999999.99').should('have.length', 2);
    });
  });

  describe('state', () => {
    it('CL-17: controls enabled when busy omitted', { tags: '@component' }, () => {
      mountCartLine();

      decreaseButton().then(($btn) => {
        expect($btn, '− default').not.to.be.disabled;
      });
      increaseButton().then(($btn) => {
        expect($btn, '+ default').not.to.be.disabled;
      });
      removeButton().then(($btn) => {
        expect($btn, 'Remove default').not.to.be.disabled;
      });
    });

    it('CL-18: controls disabled when busy', { tags: '@component' }, () => {
      mountCartLine(defaultLine, { busy: true });

      decreaseButton().then(($btn) => {
        expect($btn, '− busy').to.be.disabled;
      });
      increaseButton().then(($btn) => {
        expect($btn, '+ busy').to.be.disabled;
      });
      removeButton().then(($btn) => {
        expect($btn, 'Remove busy').to.be.disabled;
      });
    });
  });

  describe('interaction', () => {
    it('CL-19: Increase calls onQuantityChange with line id and 3', { tags: '@component' }, () => {
      mountCartLine();

      increaseButton().click();

      cy.get('@onQuantityChange').should('have.been.calledOnceWithExactly', 'ln-1a2b3c4d', 3);
      cy.get('@onRemove').should('not.have.been.called');
    });

    it('CL-20: Decrease calls onQuantityChange with line id and 1', { tags: '@component' }, () => {
      mountCartLine();

      decreaseButton().click();

      cy.get('@onQuantityChange').should('have.been.calledOnceWithExactly', 'ln-1a2b3c4d', 1);
      cy.get('@onRemove').should('not.have.been.called');
    });

    it('CL-21: Increase uses line.id ln-other', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, id: 'ln-other' });

      increaseButton().click();

      cy.get('@onQuantityChange').should('have.been.calledOnceWithExactly', 'ln-other', 3);
    });

    it('CL-22: Remove calls onRemove with line id', { tags: '@component' }, () => {
      mountCartLine();

      removeButton().click();

      cy.get('@onRemove').should('have.been.calledOnceWithExactly', 'ln-1a2b3c4d');
      cy.get('@onQuantityChange').should('not.have.been.called');
    });

    it('CL-23: Remove uses line.id ln-other', { tags: '@component' }, () => {
      mountCartLine({ ...defaultLine, id: 'ln-other' });

      removeButton().click();

      cy.get('@onRemove').should('have.been.calledOnceWithExactly', 'ln-other');
    });

    it('CL-24: busy — clicks on disabled controls do not call callbacks', { tags: '@component' }, () => {
      mountCartLine(defaultLine, { busy: true });

      increaseButton().click({ force: true });
      removeButton().click({ force: true });

      cy.get('@onQuantityChange').should('not.have.been.called');
      cy.get('@onRemove').should('not.have.been.called');
    });
  });

  describe('accessibility', () => {
    it('CL-25: row is a listitem inside ul', { tags: '@component' }, () => {
      mountCartLine();

      cy.findByRole('listitem').should('exist');
    });

    it('CL-26: Decrease quantity button named', { tags: '@component' }, () => {
      mountCartLine();

      cy.findByRole('button', { name: 'Decrease quantity' });
    });

    it('CL-27: Increase quantity button named', { tags: '@component' }, () => {
      mountCartLine();

      cy.findByRole('button', { name: 'Increase quantity' });
    });

    it('CL-28: Remove Monstera Deliciosa button named', { tags: '@component' }, () => {
      mountCartLine();

      cy.findByRole('button', { name: 'Remove Monstera Deliciosa' });
    });

    it('CL-29: disabled busy controls keep their names', { tags: '@component' }, () => {
      mountCartLine(defaultLine, { busy: true });

      cy.findByRole('button', { name: 'Decrease quantity' }).then(($btn) => {
        expect($btn, '− name when busy').to.be.disabled;
      });
      cy.findByRole('button', { name: 'Increase quantity' }).then(($btn) => {
        expect($btn, '+ name when busy').to.be.disabled;
      });
      cy.findByRole('button', { name: 'Remove Monstera Deliciosa' }).then(($btn) => {
        expect($btn, 'Remove name when busy').to.be.disabled;
      });
    });

    it('CL-30: exactly three buttons', { tags: '@component' }, () => {
      mountCartLine();

      cy.findAllByRole('button').should('have.length', 3);
    });

    it('CL-31: Quantity of Monstera Deliciosa group', { tags: '@component' }, () => {
      mountCartLine();

      cy.findByRole('group', { name: 'Quantity of Monstera Deliciosa' });
    });

    it('CL-32: accessible Price each: and Line total:', { tags: '@component' }, () => {
      mountCartLine();

      cy.findByText('Price each:');
      cy.findByText('Line total:');
    });

    it('CL-33: no img role; name identifies the plant', { tags: '@component' }, () => {
      mountCartLine();

      cy.findByRole('img').should('not.exist');
      cy.findByText('Monstera Deliciosa');
    });

    it('CL-35: keyboard activates Remove', { tags: '@component' }, () => {
      mountCartLine();

      removeButton().type(' ');

      cy.get('@onRemove').should('have.been.calledWith', 'ln-1a2b3c4d');
    });

    it('CL-36: keyboard activates Increase', { tags: '@component' }, () => {
      mountCartLine();

      increaseButton().type(' ');

      cy.get('@onQuantityChange').should('have.been.calledWith', 'ln-1a2b3c4d', 3);
    });

    it('CL-37: keyboard activates Decrease', { tags: '@component' }, () => {
      mountCartLine();

      decreaseButton().type(' ');

      cy.get('@onQuantityChange').should('have.been.calledWith', 'ln-1a2b3c4d', 1);
    });
  });
});
