/**
 * Created by IvanP on 14.11.2016.
 */
import AggregatedTable from 'r-aggregated-table';
import ReportalBase from 'r-reportal-base';
import HierarchyRowMeta from './hierarchy-row-meta';

class HierarchyBase extends AggregatedTable {
  constructor(options){
    let {
      source,
      rowheaderColumnIndex,defaultHeaderRow,dataStripDirection='row',excludeBlock,excludeColumns,excludeRows,
      sorting,
      floatingHeader
    } = options;

    super({source,
      rowheaderColumnIndex,defaultHeaderRow,dataStripDirection,excludeBlock,excludeColumns,excludeRows,
      sorting,
      floatingHeader
    });
    this._flatEvent = ReportalBase.newEvent('reportal-table-hierarchy-flat-view');
    this._treeEvent = ReportalBase.newEvent('reportal-table-hierarchy-tree-view');
  }

  /**
   * Replaces category label in the array in the hierarchical column position and in the html row through meta. Replacing it in the array is important for sorting by category.
   * @param {Array} row - an item in the `this.data` Array
   * */
  static updateCategoryLabel(flat,column){
      let cell = this.nameCell,
        // we want to make sure if there is a link (drill-down content) then we populate the link with new title, else write to the last text node.
        label = cell.querySelector('a')? cell.querySelector('a') : cell.childNodes.item(cell.childNodes.length-1),
        text = flat? this.flatName: this.name;
      // update the label in the array. Since we didn't include the block label, we need to offset it by one from the column in all cases.
      if(this.data)this.data[column].data = text;
      // update the label in the table.
      label.nodeType==3? label.nodeValue=text : label.textContent = text;
  }

  /**
   * function to add button to the left of the rowheader
   * @param {Object} row - meta for the row element in the table
   */
  static addCollapseButton(row){
    let collapseButton = document.createElement("div");
    collapseButton.classList.add("reportal-collapse-button");
    collapseButton.addEventListener('click', () => {row.collapsed = !row.collapsed;});
    row.nameCell.insertBefore(collapseButton,row.nameCell.firstChild);
    row.nameCell.classList.add('reportal-hierarchical-cell');
  }

  /**
   * If `blocks` array is not empty, then we have blocks that rowspan across hierarchy instances. This function creates meta for blocks, and makes them accessible as properties in the array. Then it launches `parseHierarchy` per each block.
   * @this HierarchyBase
   * @param {Array} data - initial data if passed
   * @param {Array} blocks - array of `blocks` passed in constructor
   * */
  setUpBlocks(blocks,options){
    if(blocks && blocks.length>0){
      let tdBlocks = this.source.querySelectorAll('.blockCell');
      if(tdBlocks.length>0){
        for(let i=0;i<tdBlocks.length;i++){
          let block = blocks[i];
          this.parseHierarchy(ReportalBase.mixin({block:{name:block, cell:tdBlocks[i]}},options));
        }
      }
    } else {
      this.parseHierarchy(options);
    }
  }

  parseHierarchy(...args){
    throw new Error('"parseHierarchy" must be implemented in the inherited class');
  }

  /**
   * This function adds toggle buttons for hierarchy (to toggle the [flat-view/tree-view]{@link HierarchyTable#flat} mode) to the hierarchy column (here available as `this.hierarchy.column`).
   * This function is executed for both the original table and the cloned header.
   * @param {HTMLTableCellElement} host - reference to the cell which acts as a header for hierarchy column
   * @param {String} buttonClassChunk - the part of the icon-class name that follows the `.icon-`. Is used to reference the icon class, but also used for the button without the `.icon-` prefix
   * @param {Boolean} flat - Boolean to be set on [`hierarchy.flat`]{@link HierarchyTable#flat} when this button is clicked.
   * @param {String} [title] - the title that describes what the button does to be show on hover (is set to native attribute `title` on the button element)
   * */
  addToggleButton(host,buttonClassChunk,flat,title){
    let button = document.createElement('span'),
        buttonContainer = document.createElement('span');
    button.classList.add(`icon-${buttonClassChunk}`);
    let containerClasses = ['btn',buttonClassChunk];
    if(flat==this.flat){containerClasses.push('active')}
    containerClasses.forEach(name=>buttonContainer.classList.add(name));
    buttonContainer.title=title;
    buttonContainer.addEventListener('click',()=>{
      if(flat==this.flat){return;} else {
        this.flat=flat;
        // we want to get all hier. toggle buttons in both cloned header and the table itself
        let hierColumnButtons = this.source.parentNode.querySelectorAll('.reportal-hierarchical-header>.btn:not(.hierarchy-search)');
        if(hierColumnButtons){
          [].slice.call(hierColumnButtons).forEach((item)=>{
          //By default one button is already `.active`, we need just to swap the `.active` class on them
          !item.classList.contains('active')?item.classList.add('active'):item.classList.remove('active');
        })}
      }
    });
    buttonContainer.appendChild(button);
    host.appendChild(buttonContainer);
  }


  /**
   * Removes a drilldown link from elements that are the lowest level of hierarchy and don't need it
   * @param {HTMLTableRowElement} row - row element in the table
   * */
  static clearLink(row){
    let link = row.querySelector("a");
    if(link) {
      link.parentElement.textContent = link.textContent;
    }
  }

  /*
   * Collapses all rows which were previously uncollapsed
   * @param {Object} parsed - a parsed Hierarchy object where key is rowID from rowheaders and value is a {@link HierarchyRowMeta} object
   * **/
  static collapseAll(parsed){
    for(let rowID in parsed){
      if(typeof parsed[rowID].collapsed != undefined){
        parsed[rowID].collapsed = true;
      }
    }
  }


  /**
   * Creates a full flat name for a hierarchical level by concatenating `name` with `meta.parent.name` via a `delimiter`
   * @this HierarchyRowMeta
   * @param {String=} [name=this.name] - initial name to start with
   * @param {String=} [delimiter='|'] - delimiter to separate flattened labels from each other
   * @return {String} Returns a flat name starting with top level of hierarchy
   * */
  static composeFlatParentName(name=this.name, delimiter='|'){
    let newName=name;
    if(this.parent!=null){
      newName = HierarchyBase.composeFlatParentName.call(this.parent, [this.parent.name, delimiter, newName].join(' '));
    }
    return newName
  }

  /**
   * Sets `this.flat`, adds/removes `.reportal-heirarchy-flat-view` to the table and updates labels for hierarchy column to flat/hierarchical view
   * @this HierarchyBase inherited object
   * @param {Boolean} val - value to set on `flat`
   * */
  set flat(val){
    this._flat=val;
    val ? this.source.classList.add('reportal-heirarchy-flat-view') : this.source.classList.remove('reportal-heirarchy-flat-view');
    // we want to update labels to match the selected view
    if(this.search && this.search.searching && this.search.highlight){this.search.highlight.remove();} //clear highlighting

    if(this.parsed){
      for(let rowID in this.parsed){
        HierarchyBase.updateCategoryLabel.call(this.parsed[rowID],val,this.column);
      }
    }

    //if the search is in progress, we need to model hierarchical/flat search which is basically redoing the search.
    if(this.search && this.search.searching){
      this.search.flat = val;
      this.search.searching = false; // clears search
      this.search.searching = true; //reinit search
      this.search.searchRowheaders(this.search.query); //pass the same query
    } else if(this.search && !this.search.searching && !val){
      for(let rowID in this.parsed){
        this.parsed[rowID].toggleHiddenRows();
      }
    }

    val?this.source.dispatchEvent(this._flatEvent):this.source.dispatchEvent(this._treeEvent)
  }
  get flat(){return this._flat}

  /**
   * A debouncing function, used for cases when as `func` function needs to be called less often, after a certain `wait` timeout or `immediate`-ly
   * @param {Function} func - the function that needs to be executed at a lesser rate
   * @param {Number} [wait=300] - timeout after which the `func`tion executes
   * @param {Boolean} [immediate=false] - flag to be set when function needs to be executed immediately (overrides `wait` timeout)
   * @return {Function}
   * */
  static debounce (func, wait=300, immediate=true){
    var timeout;
    return ()=>{
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }
}

export default HierarchyBase
