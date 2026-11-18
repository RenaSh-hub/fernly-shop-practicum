const PLANT_ID = 'pl-test-detail';
const PLANT_PATH = `/plants/${PLANT_ID}`;
const NEW_REVIEW_TEXT = 'This plant fills the room with jungle vibes.';

function visitSignedIn(path: string) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('fernly_token', 'cypress-stub-token');
    },
  });
}

function stubPlantPage() {
  cy.intercept('GET', `/api/plants/${PLANT_ID}`, { fixture: 'plants/plant-detail-positive.json' }).as('plant');
  cy.intercept('GET', '/api/plants?*', { fixture: 'plants/plant-detail-all-empty.json' }).as('plants');
}

describe('Plant reviews (/plants/:plantId Reviews slot)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  describe('sign-in gate', () => {
    it('PR-03-01: shows Write a review form heading when signed in', { tags: '@ui' }, () => {
      stubPlantPage();
      cy.intercept('GET', '/api/auth/me', { fixture: 'cart/auth-me.json' }).as('authMe');
      cy.intercept('GET', `/api/plants/${PLANT_ID}/reviews`, { fixture: 'reviews/reviews-list-positive.json' }).as(
        'reviews',
      );
      visitSignedIn(PLANT_PATH);
      cy.wait(['@authMe', '@plant', '@plants', '@reviews']);

      cy.findByRole('heading', { name: 'Write a review' });
    });

    it('PR-03-02: shows Sign in link to login next plant; no Write a review form', { tags: '@ui' }, () => {
      stubPlantPage();
      cy.intercept('GET', `/api/plants/${PLANT_ID}/reviews`, { fixture: 'reviews/reviews-list-positive.json' }).as(
        'reviews',
      );
      cy.visit(PLANT_PATH);
      cy.wait(['@plant', '@plants', '@reviews']);

      cy.findByRole('region', { name: 'Reviews' }).within(() => {
        cy.findByRole('link', { name: 'Sign in' }).then(($link) => {
          expect($link, 'sign-in next plant').to.have.attr('href', `/login?next=${PLANT_PATH}`);
        });
        cy.findByRole('heading', { name: 'Write a review' }).should('not.exist');
      });
    });

    it('PR-03-03: hides Post review and rating radiogroup when signed out', { tags: '@ui' }, () => {
      stubPlantPage();
      cy.intercept('GET', `/api/plants/${PLANT_ID}/reviews`, { fixture: 'reviews/reviews-list-positive.json' }).as(
        'reviews',
      );
      cy.visit(PLANT_PATH);
      cy.wait(['@plant', '@plants', '@reviews']);

      cy.findByRole('button', { name: 'Post review' }).should('not.exist');
      cy.findByRole('radiogroup', { name: 'Your rating' }).should('not.exist');
    });
  });

  describe('list load', () => {
    it('PR-10-01: shows Reviews heading, average line, and both authors', { tags: '@ui' }, () => {
      stubPlantPage();
      cy.intercept('GET', `/api/plants/${PLANT_ID}/reviews`, { fixture: 'reviews/reviews-list-positive.json' }).as(
        'reviews',
      );
      cy.visit(PLANT_PATH);
      cy.wait(['@plant', '@plants', '@reviews']);

      cy.findByRole('heading', { name: 'Reviews' });
      cy.findByText(/4\.7 out of 5 · 2 reviews/);
      cy.findByText('Ava');
      cy.findByText('Ben');
    });

    it('PR-10-06: shows Loading reviews… before the list arrives', { tags: '@ui' }, () => {
      stubPlantPage();
      cy.intercept('GET', `/api/plants/${PLANT_ID}/reviews`, {
        delay: 750,
        fixture: 'reviews/reviews-list-positive.json',
      }).as('reviews');
      cy.visit(PLANT_PATH);
      cy.wait(['@plant', '@plants']);

      cy.findByText('Loading reviews…');
      cy.wait('@reviews');
      cy.findByText(/4\.7 out of 5 · 2 reviews/);
    });
  });

  describe('post + toast + refresh', () => {
    it('PR-10-02: toast Thanks for your review! and new review appears without reload', { tags: '@ui' }, () => {
      stubPlantPage();
      cy.intercept('GET', '/api/auth/me', { fixture: 'cart/auth-me.json' }).as('authMe');
      let reviewsGets = 0;
      cy.intercept('GET', `/api/plants/${PLANT_ID}/reviews`, (req) => {
        reviewsGets += 1;
        if (reviewsGets === 1) {
          req.reply({ fixture: 'reviews/reviews-list-positive.json' });
        } else {
          req.reply({ fixture: 'reviews/reviews-list-after-post.json' });
        }
      }).as('reviews');
      cy.intercept('POST', `/api/plants/${PLANT_ID}/reviews`, {
        statusCode: 201,
        fixture: 'reviews/reviews-post-created.json',
      }).as('postReview');

      visitSignedIn(PLANT_PATH);
      cy.wait(['@authMe', '@plant', '@plants', '@reviews']);

      cy.findByRole('radio', { name: '5 stars' }).click();
      cy.findByLabelText('Your review').type(NEW_REVIEW_TEXT);
      cy.findByRole('button', { name: 'Post review' }).click();
      cy.wait('@postReview');

      // Toast uses role=status but so does QuantityStepper's <output>; assert by visible copy.
      cy.findByText('Thanks for your review!');
      cy.findByText(NEW_REVIEW_TEXT);
      cy.findByText('Ava Fern');
    });
  });

  describe('errors', () => {
    it("PR-10-03: error banner Reviews couldn't be loaded. with Try again", { tags: '@ui' }, () => {
      stubPlantPage();
      cy.intercept('GET', `/api/plants/${PLANT_ID}/reviews`, {
        statusCode: 500,
        fixture: 'reviews/reviews-get-server-error.json',
      }).as('reviews');
      cy.visit(PLANT_PATH);
      cy.wait(['@plant', '@plants', '@reviews']);

      cy.findByRole('alert').within(() => {
        cy.findByText("Reviews couldn't be loaded.");
      });
      cy.findByRole('button', { name: 'Try again' });
    });

    it('PR-10-04: form alert surfaces already_reviewed API detail', { tags: '@ui' }, () => {
      stubPlantPage();
      cy.intercept('GET', '/api/auth/me', { fixture: 'cart/auth-me.json' }).as('authMe');
      cy.intercept('GET', `/api/plants/${PLANT_ID}/reviews`, { fixture: 'reviews/reviews-list-positive.json' }).as(
        'reviews',
      );
      cy.intercept('POST', `/api/plants/${PLANT_ID}/reviews`, {
        statusCode: 409,
        fixture: 'reviews/reviews-post-already-reviewed.json',
      }).as('postReview');

      visitSignedIn(PLANT_PATH);
      cy.wait(['@authMe', '@plant', '@plants', '@reviews']);

      cy.findByRole('radio', { name: '5 stars' }).click();
      cy.findByLabelText('Your review').type(NEW_REVIEW_TEXT);
      cy.findByRole('button', { name: 'Post review' }).click();
      cy.wait('@postReview');

      cy.findByRole('alert').within(() => {
        cy.findByText('You already reviewed this plant.');
      });
    });
  });

  describe('empty', () => {
    it('PR-10-05: shows empty invite copy for first review', { tags: '@ui' }, () => {
      stubPlantPage();
      cy.intercept('GET', `/api/plants/${PLANT_ID}/reviews`, { fixture: 'reviews/reviews-list-empty.json' }).as(
        'reviews',
      );
      cy.visit(PLANT_PATH);
      cy.wait(['@plant', '@plants', '@reviews']);

      cy.findByText("No reviews yet. Be the first to share how it's growing.");
    });
  });
});
