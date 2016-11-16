/**
 * Created by IvanP on 14.11.2016.
 */
import AggregatedTable from 'r-aggregated-table';
import ReportalBase from 'r-reporal-base/src/reportal-base';
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
    collapseButton.addEventListener('click', () => {HierarchyRowMeta.setCollapsed.call(row,!row.collapsed);});
    row.nameCell.insertBefore(collapseButton,row.nameCell.firstChild);
    row.nameCell.classList.add('reportal-hierarchical-cell');
  }

  /**
   * If `blocks` array is not empty, then we have blocks that rowspan across hierarchy instances. This function creates meta for blocks, and makes them accessible as properties in the array. Then it launches `parseHierarchy` per each block.
   * @param {Array} data - initial data if passed
   * @param {Array} blocks - array of `blocks` passed in constructor
   * */
  static setUpBlocks(source,blocks,options){
    if(blocks && blocks.length>0){
      var tdBlocks = source.querySelectorAll('.blockCell');
      if(tdBlocks.length>0){
        for(let i=0;i<tdBlocks.length;i++){
          let block = blocks[i];
          console.log(ReportalBase.mixin({block:{name:block, cell:tdBlocks[i]}},options));
          this.constructor.parseHierarchy.call(this,ReportalBase.mixin({block:{name:block, cell:tdBlocks[i]}},options));
        }
      }
    } else {
      this.constructor.parseHierarchy.call(this,options);
    }
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
   * **/
  static collapseAll(parsed){
    for(let rowID in parsed){
      let collapsed = parsed[rowID].collapsed;
      if(typeof collapsed != undefined && !collapsed){
        HierarchyRowMeta.setCollapsed.call(row,true);
      }
    }
  }

  /**
   * Uncollapses the immediate parents of a row which `meta` is passed as an attribute. Utility function for serach to uncollapse all parents of a row that was matched during search
   * @param {Object} meta - `row.meta` object. See {@link HierarchyTable#setupMeta} for details
   * */
  static uncollapseParents(){
    if(this.parent!=null){ // if `parent` String is not empty - then it's not top level parent.
      if(this.parent.collapsed){HierarchyRowMeta.setCollapsed.call(this.parent,false)}
      this.parent.row.classList.add('matched-search');
      HierarchyBase.uncollapseParents.call(this.parent);
    }
  }

  /**
   * Creates a full flat name for a hierarchical level by concatenating `name` with `meta.parent.name` via a `delimiter`
   * @param {Object} meta - meta data of the row
   * @param {String=} [name=meta.name] - initial name to start with
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
   * @param {Boolean} val - value to set on `flat`
   * */
  static setFlat(val){
    this.flat=val;
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
      this.search.searching = false; // clears search
      this.search.searching = true; //reinit search
      this.searchRowheaders(this.search.query); //pass the same query
    } else if(this.search && !this.search.searching && !val){
      for(let rowID in this.parsed){
        HierarchyRowMeta.toggleHiddenRows.call(this.parsed[rowID]);
      }
    }

    val?this.source.dispatchEvent(this._flatEvent):this.source.dispatchEvent(this._treeEvent)
  }

  /**
   * This function runs through the data and looks for a match in `row.meta.flatName` (for flat view) or `row.meta.name` (for tree view) against the `str`.
   * @param {String} str - expression to match against (is contained in `this.search.query`)
   * */
  searchRowheaders(str){
    let regexp = new RegExp('('+str+')','i');
    AggregatedTable.dimensionalDataIterator(this.data,this.multidimensional,(dataDimension)=>{
      dataDimension.forEach(row=>{
        if(this.flat){
          HierarchyRowMeta.setMatches.call(row,regexp.test(row.flatName));
          HierarchyRowMeta.setHidden.call(row,false)
        } else {
          // if it has a parent and maybe not matches and the parent has match, then let it and its children be displayed
          let matches = regexp.test(row.name);
          if(row.parent!=null && !matches && row.parent.matches){
            // just in case it's been covered in previous iteration
            if(!row.matches){HierarchyRowMeta.setMatches.call(row,true)}
            else if(row.hasChildren && !row.collapsed){
              HierarchyRowMeta.setCollapsed.call(row,true); //if a parent row is uncollapsed and has a match, but the current item used to be a match and was uncollapsed but now is not a match
            }
            HierarchyRowMeta.setHidden.call(row,row.parent.collapsed);
          } else { // if has no parent or parent not matched let's test it, maybe it can have a match, if so, display his parents and children
            HierarchyRowMeta.setMatches.call(row,matches);
            if(matches){
              HierarchyBase.uncollapseParents.call(row);
            }
          }
        }
      });
    });

    this.search.highlight.apply(str);
  }






}

export default HierarchyBase
