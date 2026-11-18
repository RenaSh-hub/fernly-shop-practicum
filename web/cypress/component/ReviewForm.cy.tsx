import { ReviewForm } from '../../src/components/ReviewForm';

describe('ReviewForm', () => {
  describe('interaction', () => {
    it(
      'PR-08-01: onSubmit once with rating 4 and trimmed text; form cleared',
      { tags: '@component' },
      () => {
        const onSubmit = cy.spy().as('onSubmit');
        cy.mount(<ReviewForm onSubmit={onSubmit} />);

        const review = '  Great plant for a sunny corner  ';
        cy.findByRole('radio', { name: '4 stars' }).click();
        cy.findByLabelText('Your review').type(review);
        cy.findByRole('button', { name: 'Post review' }).click();

        cy.get('@onSubmit').should('have.been.calledOnceWithExactly', {
          rating: 4,
          text: review.trim(),
        });
        cy.findByLabelText('Your review').should('have.value', '');
        cy.findByRole('button', { name: 'Post review' }).click();
        cy.findByRole('alert').should(
          'have.text',
          'Choose a rating from 1 to 5 stars.',
        );
        cy.get('@onSubmit').should('have.been.calledOnce');
      },
    );
  });

  describe('negative', () => {
    it(
      'PR-08-02: alert Choose a rating; onSubmit not called',
      { tags: '@component' },
      () => {
        const onSubmit = cy.spy().as('onSubmit');
        cy.mount(<ReviewForm onSubmit={onSubmit} />);

        cy.findByRole('button', { name: 'Post review' }).click();

        cy.findByRole('alert').should(
          'have.text',
          'Choose a rating from 1 to 5 stars.',
        );
        cy.get('@onSubmit').should('not.have.been.called');
      },
    );

    it(
      'PR-08-03: alert Write at least 10 characters; onSubmit not called',
      { tags: '@component' },
      () => {
        const onSubmit = cy.spy().as('onSubmit');
        cy.mount(<ReviewForm onSubmit={onSubmit} />);

        cy.findByRole('radio', { name: '3 stars' }).click();
        cy.findByLabelText('Your review').type('too short');
        cy.findByRole('button', { name: 'Post review' }).click();

        cy.findByRole('alert').should('have.text', 'Write at least 10 characters.');
        cy.get('@onSubmit').should('not.have.been.called');
      },
    );
  });

  describe('state', () => {
    it('PR-08-04: Posting… disabled while busy', { tags: '@component' }, () => {
      cy.mount(<ReviewForm busy onSubmit={cy.spy()} />);

      cy.findByRole('button', { name: 'Posting…' }).then(($btn) => {
        expect($btn, 'submit while busy').to.be.disabled;
      });
    });

    it(
      'PR-08-05: alert shows You already reviewed this plant.',
      { tags: '@component' },
      () => {
        cy.mount(
          <ReviewForm
            error="You already reviewed this plant."
            onSubmit={cy.spy()}
          />,
        );

        cy.findByRole('alert').should(
          'have.text',
          'You already reviewed this plant.',
        );
      },
    );
  });

  describe('accessibility', () => {
    it(
      'PR-08-06: textarea labelled Your review; heading Write a review',
      { tags: '@component' },
      () => {
        cy.mount(<ReviewForm onSubmit={cy.spy()} />);

        cy.findByLabelText('Your review').should('exist');
        cy.findByRole('heading', { name: 'Write a review' }).should('exist');
      },
    );
  });
});
