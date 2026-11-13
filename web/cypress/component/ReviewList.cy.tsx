import { ReviewList, type ReviewItem } from '../../src/components/ReviewList';

const twoReviews: ReviewItem[] = [
  {
    id: 'rv-ava',
    author: 'Ava',
    rating: 5,
    text: 'Thriving on my bright windowsill after two months.',
    createdAt: '2024-06-01T12:00:00.000Z',
  },
  {
    id: 'rv-ben',
    author: 'Ben',
    rating: 4,
    text: 'Happy plant with only a little leaf tip browning.',
    createdAt: '2024-05-15T12:00:00.000Z',
  },
];

const oneReview: ReviewItem[] = [
  {
    id: 'rv-one',
    author: 'Ava',
    rating: 5,
    text: 'Thriving on my bright windowsill after two months.',
    createdAt: '2024-06-01T12:00:00.000Z',
  },
];

const oneReviewRatingFour: ReviewItem[] = [
  {
    id: 'rv-four',
    author: 'Ben',
    rating: 4,
    text: 'Happy plant with only a little leaf tip browning.',
    createdAt: '2024-05-15T12:00:00.000Z',
  },
];

function normalizedText(node: { text: () => string }): string {
  return node.text().replace(/\s+/g, ' ').trim();
}

describe('ReviewList', () => {
  describe('list + average', () => {
    it('PR-09-01: shows ★ 4.7 out of 5 · 2 reviews with both authors, ratings, dates, and text', { tags: '@component' }, () => {
      cy.mount(<ReviewList reviews={twoReviews} average={4.7} count={2} />);

      cy.findByText(/4\.7 out of 5 · 2 reviews/).then(($el) => {
        expect(normalizedText($el), 'average line').to.equal('★ 4.7 out of 5 · 2 reviews');
      });

      cy.findByRole('list').within(() => {
        cy.findAllByRole('listitem').should('have.length', 2);

        cy.findByText('Ava').should('be.visible');
        cy.findByText('Ben').should('be.visible');
        cy.findByText('Thriving on my bright windowsill after two months.').should('be.visible');
        cy.findByText('Happy plant with only a little leaf tip browning.').should('be.visible');
        cy.findByText('Jun 1, 2024').should('be.visible');
        cy.findByText('May 15, 2024').should('be.visible');
        cy.findByText('5 out of 5', { includeHidden: true });
        cy.findByText('4 out of 5', { includeHidden: true });
      });
    });
  });

  describe('empty', () => {
    it("PR-09-02: shows empty invite and no average line", { tags: '@component' }, () => {
      cy.mount(<ReviewList reviews={[]} average={0} count={0} />);

      cy.findByText("No reviews yet. Be the first to share how it's growing.").should('be.visible');
      cy.findByText(/out of 5/).should('not.exist');
      cy.findByRole('list').should('not.exist');
    });
  });

  describe('singular', () => {
    it('PR-09-03: uses singular review for count 1', { tags: '@component' }, () => {
      cy.mount(<ReviewList reviews={oneReview} average={5} count={1} />);

      cy.findByText(/5\.0 out of 5 · 1 review/).then(($el) => {
        expect(normalizedText($el), 'singular average line').to.equal('★ 5.0 out of 5 · 1 review');
      });
      cy.findByText(/1 reviews/).should('not.exist');
    });
  });

  describe('accessibility', () => {
    it('PR-09-04: decorative ★ marks are aria-hidden; visually hidden 4 out of 5 is present', { tags: '@component' }, () => {
      cy.mount(<ReviewList reviews={oneReviewRatingFour} average={4} count={1} />);

      cy.get('[aria-hidden="true"]').then(($hidden) => {
        expect($hidden.length, 'decorative ★ spans').to.be.at.least(1);
        const marks = [...$hidden].map((el) => el.textContent ?? '');
        expect(marks.some((t) => t.includes('★')), '★ present in aria-hidden spans').to.equal(true);
        expect(
          marks.every((t) => /^★+$/.test(t)),
          'aria-hidden spans are only ★ marks',
        ).to.equal(true);
      });

      cy.findByText('4 out of 5', { includeHidden: true }).then(($el) => {
        expect(normalizedText($el), 'screen-reader rating').to.equal('4 out of 5');
      });
    });
  });
});
