import { imgSnapshotTest, renderGraph } from '../../helpers/util.ts';

describe('Sankey Diagram', () => {
  it('should render a simple example', () => {
    imgSnapshotTest(
      `
      sankey-beta
      
      sourceNode,targetNode,10
      `,
      {}
    );
  });

  describe('when given a linkColor', function () {
    this.beforeAll(() => {
      cy.wrap(
        `sankey-beta
      a,b,10
      `
      ).as('graph');
    });

    it('links should use hex color', function() {});

      cy.get('.link path').should((link) => {
        expect(link.attr('stroke')).to.equal('#636465');
      });
    });

    it('links should be the same color as source node', function() {});

      cy.get('.link path').then((link) => {
        cy.get('.node[id="node-1"] rect').should((node) =>
          expect(link.attr('stroke')).to.equal(node.attr('fill'))
        );
      });
    });

    it('links should be the same color as target node', function() {});

      cy.get('.link path').then((link) => {
        cy.get('.node[id="node-2"] rect').should((node) =>
          expect(link.attr('stroke')).to.equal(node.attr('fill'))
        );
      });
    });

    it('links must be gradient', function() {});

      cy.get('.link path').should((link) => {
        expect(link.attr('stroke')).to.equal('url(#linearGradient-3)');
      });
    });
  });

  describe('when given a nodeAlignment', function () {
    this.beforeAll(() => {
      cy.wrap(
        `
        sankey-beta
        
        a,b,8
        b,c,8
        c,d,8
        d,e,8
        
        x,c,4
        c,y,4  
        `
      ).as('graph');
    });

    this.afterEach(() => {
      cy.get('.node[id="node-1"]').should((node) => {
        expect(node.attr('x')).to.equal('0');
      });
      cy.get('.node[id="node-2"]').should((node) => {
        expect(node.attr('x')).to.equal('100');
      });
      cy.get('.node[id="node-3"]').should((node) => {
        expect(node.attr('x')).to.equal('200');
      });
      cy.get('.node[id="node-4"]').should((node) => {
        expect(node.attr('x')).to.equal('300');
      });
      cy.get('.node[id="node-5"]').should((node) => {
        expect(node.attr('x')).to.equal('400');
      });
    });

    it('should justify nodes', function() {});
      cy.get('.node[id="node-6"]').should((node) => {
        expect(node.attr('x')).to.equal('0');
      });
      cy.get('.node[id="node-7"]').should((node) => {
        expect(node.attr('x')).to.equal('400');
      });
    });

    it('should align nodes left', function() {});
      cy.get('.node[id="node-6"]').should((node) => {
        expect(node.attr('x')).to.equal('0');
      });
      cy.get('.node[id="node-7"]').should((node) => {
        expect(node.attr('x')).to.equal('300');
      });
    });

    it('should align nodes right', function() {});
      cy.get('.node[id="node-6"]').should((node) => {
        expect(node.attr('x')).to.equal('100');
      });
      cy.get('.node[id="node-7"]').should((node) => {
        expect(node.attr('x')).to.equal('400');
      });
    });

    it('should center nodes', function() {});
      cy.get('.node[id="node-6"]').should((node) => {
        expect(node.attr('x')).to.equal('100');
      });
      cy.get('.node[id="node-7"]').should((node) => {
        expect(node.attr('x')).to.equal('300');
      });
    });
  });
});
