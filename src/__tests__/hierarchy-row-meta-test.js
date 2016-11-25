/**
 * Created by IvanP on 25.11.2016.
 */
import HierarchyRowMeta from '../hierarchy-row-meta'
describe('HierarchyRowMeta', () => {
  var row;
  beforeEach(() => {
    jasmine.getFixtures().fixturesPath = 'base/src/__tests__/fixtures';
    loadFixtures('table-hierarchy.html');
    let tableRow = document.querySelector('.reportal-hierarchy-table>tbody>tr');
    let firstChild= new HierarchyRowMeta({
      row:tableRow,
      nameCell:tableRow.children.item(1),
      name:"Look and feel | Room to shop",
      flatName: 'Room to shop',
      rowIndex:1,
    }),deepchild = new HierarchyRowMeta({
      row:tableRow,
      nameCell:tableRow.children.item(2),
      name:"Look and feel | Display",
      flatName: 'Display',
      rowIndex:3,
    }),
      secondChild = new HierarchyRowMeta({
      row:tableRow,
      nameCell:tableRow.children.item(1),
      name:"Look and feel | Signage",
      flatName: 'Signage',
      rowIndex:2,
        hasChildren:true,
        children:[deepchild]
    })
      ;
    row = new HierarchyRowMeta({
      row:tableRow,
      nameCell:tableRow.firstElementChild,
      name:"Look and feel",
      flatName: 'Look and feel',
      rowIndex:0,
      hasChildren:true,
      children:[firstChild,secondChild]});
  });

  it('.hasChildren should set .reportal-no-children on row if doesn\'t have children and set the value if passed',()=>{
    expect(row.hasChildren).toBeDefined();
    expect(row.hasChildren).toBeTruthy();
    row.hasChildren = false;
    expect(row.hasChildren).toBeFalsy();
    expect(row.row).toBeMatchedBy('.reportal-no-children');
    row.hasChildren = true;
    expect(row.hasChildren).toBeTruthy();
    expect(row.row).not.toBeMatchedBy('.reportal-no-children');
  });

  it('.hidden should set .reportal-hidden-row and a  value if passed',()=>{
    expect(row.hidden).not.toBeDefined();
    row.hidden = true;
    expect(row.hidden).toBeTruthy();
    expect(row.row).toBeMatchedBy('.reportal-hidden-row');
    row.hidden = false;
    expect(row.hidden).toBeFalsy();
    expect(row.row).not.toBeMatchedBy('.reportal-hidden-row');
  });

  it('.collapsed should set .reportal-collapsed/uncollapsed-row and a value and dispatch event and trigger .toggleHiddenRows',()=>{
    row.hasChildren = true;
    spyOn(row,'toggleHiddenRows').and.callThrough();
    expect(row.toggleHiddenRows).not.toHaveBeenCalled();

    expect(row.children[0]).not.toBeMatchedBy('.reportal-collapsed-row');
    expect(row.children[1]).not.toBeMatchedBy('.reportal-collapsed-row');
    expect(row.children[0]).not.toBeMatchedBy('.reportal-uncollapsed-row');
    expect(row.children[1]).not.toBeMatchedBy('.reportal-uncollapsed-row');

    row.collapsed = true;
    expect(row.collapsed).toBeTruthy();
    expect(row.toggleHiddenRows).toHaveBeenCalledTimes(1);
    expect(row.row).toBeMatchedBy('.reportal-collapsed-row');
    expect(row.row).not.toBeMatchedBy('.reportal-uncollapsed-row');
    expect(row.children[0].hidden).toBeTruthy();
    expect(row.children[1].hidden).toBeTruthy();
    expect(row.children[1].children[0].hidden).toBeTruthy();

    row.collapsed = false;
    expect(row.collapsed).toBeFalsy();
    expect(row.toggleHiddenRows).toHaveBeenCalledTimes(2);
    expect(row.row).not.toBeMatchedBy('.reportal-collapsed-row');
    expect(row.row).toBeMatchedBy('.reportal-uncollapsed-row');
    expect(row.children[0].hidden).toBeFalsy();
    expect(row.children[1].hidden).toBeFalsy();
    expect(row.children[1].children[0].hidden).toBeTruthy();
  });

});
