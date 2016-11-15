import AggregatedTableRowMeta from 'r-aggregated-table/src/aggregated-table-row-meta';
import ReportalBase from "r-reporal-base/src/reportal-base";

/**
 * @memberof Hierarchy
 * @extends AggregatedTableRowMeta
 * @prop {HTMLTableRowElement} row - reference to the `<tr>` element
 * @prop {String} [flatName] - default string name ('|'-delimited) for hierarchy
 * @prop {String} name - a trimmed version of `flatName` containing label for this item without parent suffices
 * @prop {HTMLTableCellElement} nameCell - reference to the `<td>` element that contains the rowheader hierarchical label/name
 * @prop {String} block - id of the block the row belongs to
 * @prop {String} parent - internal Reportal id of parent row
 * @prop {Number} level=0 - level of hierarchy, increments form `0`
 * @prop {Boolean} hidden - flag set to hidden rows (meaning their parent is in collapsed state)
 * @prop {Boolean} collapsed - flag only set to rows which have children (`hasChildren=true`)
 * @prop {Boolean} [matches=false] - flag set to those rows which match `search.query`
 * @prop {Boolean} [hasChildren] - flag set to rows which contain children
 * @prop {Array} children - child rows if `hasChildren == true
 * */
class HierarchyRowMeta extends AggregatedTableRowMeta{
  /**
   * This function builds a prototype for each row
   * @param {HTMLTableRowElement} row - reference to the `<tr>` element
   * @param {String} [flatName] - default string name ('|'-delimited) for hierarchy
   * @param {String} name - a trimmed version of `flatName` containing label for this item without parent suffices
   * @param {HTMLTableCellElement} nameCell - reference to the `<td>` element that contains the rowheader hierarchical label/name
   * @param {String} block - id of the block the row belongs to
   * @param {String} parent - internal Reportal id of parent row
   * @param {Number} level=0 - level of hierarchy, increments form `0`
   * @param {Boolean} hidden - flag set to hidden rows (meaning their parent is in collapsed state)
   * @param {Boolean} collapsed - flag only set to rows which have children (`hasChildren=true`)
   * @param {Boolean} [matches=false] - flag set to those rows which match `search.query`
   * @param {Boolean} [hasChildren] - flag set to rows which contain children
   * @param {Array} children - child rows if `hasChildren == true
   * */
  constructor({row, nameCell, id, name, flatName, block, parent=null, level=0, hidden, collapsed, matches=false, hasChildren, children,rowIndex}={}){
    super({row, nameCell, name, block});
    if(flatName)this.flatName = flatName;
    this.id = id;
    this.parent=parent;
    if(children)this.children=children;
    this.level=level;
    this.rowIndex = rowIndex;

    HierarchyRowMeta.setHasChildren.call(this,hasChildren);
    HierarchyRowMeta.setHidden.call(this,hidden);
    HierarchyRowMeta.setCollapsed.call(this,collapsed);
    HierarchyRowMeta.setMatches.call(this,matches);
  }

  static setHasChildren(val){
    this.hasChildren = val;
    if(typeof val!=undefined){
      if(!val){
        this.row.classList.add('reportal-no-children')
      } else {
        this.row.classList.remove('reportal-no-children');
      }
    }
  }

  static setHidden(val){
    this.hidden=val;
    if(typeof val!=undefined){
      if(val){
        this.row.classList.add("reportal-hidden-row")
      } else {
        this.row.classList.remove("reportal-hidden-row")
      }
    }
  }

  /**
   * @fires HierarchyRowMeta#reportal-table-hierarchy-collapsed
   * @fires HierarchyRowMeta#reportal-table-hierarchy-uncollapsed
   * */
  static setCollapsed(val){
    if(typeof val != undefined && this.hasChildren){
      this.collapsed=val;
      if(val){
        this.row.classList.add("reportal-collapsed-row");
        this.row.classList.remove("reportal-uncollapsed-row");
        HierarchyRowMeta.toggleHiddenRows.call(this);
        this.row.dispatchEvent(this.constructor._collapseEvent);
      } else {
        this.row.classList.add("reportal-uncollapsed-row");
        this.row.classList.remove("reportal-collapsed-row");
        HierarchyRowMeta.toggleHiddenRows.call(this);
        this.row.dispatchEvent(this.constructor._uncollapseEvent);
      }
    }
  }

  static setMatches(val){
    this.matches=val;
    if(val){
      this.row.classList.add("matched-search");
    } else {
      this.row.classList.contains("matched-search") ? this.row.classList.remove("matched-search") : null;
      if(this.hasChildren){
        this.collapsed=true;
      }
    }
  }

  /**
   * Function to hide or show child rows of a collapsed/expanded row
   * @param {Object} meta - meta in the row
   */
  static toggleHiddenRows(){
    if(this.hasChildren && this.children){
      this.children.forEach(childRow=>{
        if(this.collapsed){                                         // if parent (`meta.row`) is collapsed
          HierarchyRowMeta.setHidden.call(childRow,true);           // hide all its children and
          if(childRow.hasChildren && !childRow.collapsed){          // if a child can be collapsed
            HierarchyRowMeta.setCollapsed.call(childRow,true);      // hide all its children and
            HierarchyRowMeta.toggleHiddenRows.call(childRow);       // repeat for its children
          }
        } else {                                                    // otherwise make sure we show all children of an expanded row
          HierarchyRowMeta.setHidden.call(childRow,false);          // hide all its children and
        }
      });
    }
  }
}
/**
 * Event fired on `row` when it's collapsed
 * @event HierarchyRowMeta#reportal-table-hierarchy-collapsed
 * */
HierarchyRowMeta._collapseEvent = ReportalBase.newEvent('reportal-table-hierarchy-collapsed');
/**
 * Event fired on `row` when it's expanded
 * @event HierarchyRowMeta#event:reportal-table-hierarchy-uncollapsed
 * */
HierarchyRowMeta._uncollapseEvent = ReportalBase.newEvent('reportal-table-hierarchy-uncollapsed');

export default HierarchyRowMeta
