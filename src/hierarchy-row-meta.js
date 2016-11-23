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
class HierarchyRowMeta extends AggregatedTableRowMeta {
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

    this.hasChildren=hasChildren;
    this.hidden=hidden;
    this.collapsed =collapsed;
    this.matches=matches;
  }

  set hasChildren(val){
    this._hasChildren = val;
    if(typeof val!=undefined){
      if(!val){
        this.row.classList.add('reportal-no-children')
      } else {
        this.row.classList.remove('reportal-no-children');
      }
    }
  }
  get hasChildren(){return this._hasChildren}

  set hidden(val){
    this._hidden=val;
    if(typeof val!=undefined){
      if(val){
        this.row.classList.add("reportal-hidden-row")
      } else {
        this.row.classList.remove("reportal-hidden-row")
      }
    }
  }
  get hidden(){return this._hidden}

  /**
   * @fires HierarchyRowMeta#reportal-table-hierarchy-collapsed
   * @fires HierarchyRowMeta#reportal-table-hierarchy-uncollapsed
   * */
  set collapsed(val){
    if(typeof val != undefined && this.hasChildren){
      this._collapsed=val;
      if(val){
        this.row.classList.add("reportal-collapsed-row");
        this.row.classList.remove("reportal-uncollapsed-row");
        this.toggleHiddenRows();
        this.row.dispatchEvent(this.constructor._collapseEvent);
      } else {
        this.row.classList.add("reportal-uncollapsed-row");
        this.row.classList.remove("reportal-collapsed-row");
        this.toggleHiddenRows();
        this.row.dispatchEvent(this.constructor._uncollapseEvent);
      }
    }
  }
  get collapsed(){return this._collapsed}

  set matches(val){
    this._matches=val;
    if(val){
      this.row.classList.add("matched-search");
    } else {
      this.row.classList.contains("matched-search") ? this.row.classList.remove("matched-search") : null;
      if(this.hasChildren){
        this.collapsed=true;
      }
    }
  }
  get matches(){return this._matches}


  /**
   * Function to hide or show child rows of a collapsed/expanded row
   */
  toggleHiddenRows(){
    if(this.hasChildren && this.children){
      this.children.forEach(childRow=>{
        if(this.collapsed){                                         // if parent (`meta.row`) is collapsed
          childRow.hidden=true;           // hide all its children and
          if(childRow.hasChildren && typeof childRow.collapsed != undefined){          // if a child can be collapsed
            childRow.collapsed=true;      // hide all its children and
            childRow.toggleHiddenRows();       // repeat for its children
          }
        } else {                                                    // otherwise make sure we show all children of an expanded row
          childRow.hidden=false;          // hide all its children and
        }
      });
    }
  }

  /**
   * Uncollapses the immediate parents of a row which `meta` is passed as an attribute. Utility function for serach to uncollapse all parents of a row that was matched during search
   * @this HierarchyRowMeta
   * */
  uncollapseParents(){
    if(this.parent!=null){ // if `parent` String is not empty - then it's not top level parent.
      if(this.parent.collapsed){this.parent.collapsed=false}
      this.parent.row.classList.add('matched-search');
      this.parent.uncollapseParents();
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
