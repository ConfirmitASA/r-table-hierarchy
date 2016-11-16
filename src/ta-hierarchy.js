/**
 * Created by IvanP on 14.11.2016.
 */
let hierarchyCSS = require('./hierarchy.css');

import TableData from 'r-aggregated-table/src/table-data';
import AggregatedTable from 'r-aggregated-table/src/aggregated-table';
import HierarchyBase from './hierarchy-base';
import HierarchyRowMeta from './hierarchy-row-meta';


class TAhierarchy extends HierarchyBase {
  constructor(options){
    let {
      source,
      hierarchy,rowheaders,flat = false, flatNameDelimiter = '|',blocks=[], clearLinks = true, //hierarchy
      rowheaderColumnIndex=0,defaultHeaderRow,dataStripDirection='row',excludeBlock,excludeColumns,excludeRows, // aggregated Table
      sorting,
      floatingHeader
    } = options;

    super({source,
      rowheaderColumnIndex,defaultHeaderRow,dataStripDirection,excludeBlock,excludeColumns,excludeRows,
      //sorting,
      floatingHeader
    });

    if(source){this.source=source;} else { throw new ReferenceError('`source` table is not specified for TAHierarchyTable')}
    if(hierarchy){this.hierarchy=hierarchy;} else { throw new ReferenceError('`hierarchy` is not specified for TAHierarchyTable')}
    if(rowheaders){this.rowheaders=rowheaders;} else { throw new ReferenceError('`rowheaders` are not specified for TAHierarchyTable')}
    this.column = rowheaderColumnIndex;
    this.flatNameDelimiter = flatNameDelimiter;

    // add class to empty hierarchy header
    let tbody = this.source.querySelector("tbody");
    this.source.querySelector(`thead>tr>td:nth-child(${this.column+1})`).classList.add('reportal-hierarchical-header');
    if(tbody.firstChild && tbody.firstChild.nodeType==3){
      tbody.removeChild(tbody.firstChild)
    }

    this.parsed = {}; //parsed hierarchy
    this.blocks = this.constructor.setUpBlocks.call(this,source,blocks,{
      hierarchy:this.hierarchy,
      rowheaders:this.rowheaders,
      rows:[].slice.call(source.parentNode.querySelectorAll(`table#${source.id}>tbody>tr`)),
      result:this.parsed
    });
    this.constructor.setFlat.call(this,flat);

    if(this.parsed){
      TAhierarchy.mapHierarchy(this.parsed,this.data,this.multidimensional);
    }
  }

  /**
   * maps hierarchy object to data object
   * */
  static mapHierarchy(parsed,data,multidimensional){
    AggregatedTable.dimensionalDataIterator(data,multidimensional,(dataDimension)=>{
      dataDimension.forEach(row=>{
        let rowId = Object.keys(parsed).find(o=>{return parsed[o].rowIndex == row[0].rowIndex});
        parsed[rowId].data = row;
        row.forEach(cell=>cell.row = parsed[rowId]);
      }); // add row to fragment in the array order, this doesn't account for column stripped data yet
    });
  }
  /**
   * Recursive function taking rows according to `hierarchy` object, adding information to that row, retrieving data from the row, and adding this array to `this.data`
   * Each item in the array has a `meta {Object}` (See {@link HierarchyTable#setupMeta}) property that has the following structure:
   *
   * ``` javascript
   * {
   *    collapsed: Boolean, // if true, the row is collapsed, defined if `hasChildren`
   *    hasChildren: Boolean, // if true, it has children
   *    flatName: String, // label for flat view ('/'-separated)
   *    name: String, // label for the current level (single-label without parent prefixes)
   *    nameCell: HTMLTableCellElement, // reference to the `<td>` element that contains the rowheader hierarchical label/name,
   *    block: String, // id of the block the row belongs to
   *    firstInBlock: Boolean, // whether the row is the first in this block, which meatns it has an extra cell at the beginning
   *    id: String, // item id from Reportal table
   *    level: Number, // hierarchy level
   *    parent: String, // parent id of the nested level
   *    row: HTMLTableRowElement // reference to the `tr` element in the table
   * }
   * ```
   *
   * @param {Array} options.hierarchy=this.hierarchy - array of hierarchy objects from Reportal
   * @param {int} options.level=0 - depth of the function
   * @param {String} options.block=null - an item from `blocks` array
   * @param {!Array} options.array - changed table for children levels
   * @return {Array}
   */
  static parseHierarchy(options){
    let {hierarchy,rowheaders,level=0,block=null,result,rows,parent=null,clearLinks=false}=options;
    let blockName = null;
    if(block!==null){
      blockName = block.name.toLowerCase();
    }

    hierarchy.forEach((item,index)=>{
      let compoundID = block!==null? `${item.id}_${blockName}` : item.id; //this row is first in the block, which means it contains the first cell as a block cell and we need to indent the cell index when changing names in hierarchical column
      if(rowheaders[compoundID]){//we want to skip those which aren't in rowheaders
        let row = rows[rowheaders[compoundID].index],
            firstInBlock = row.classList.contains('firstInBlock'); //this row is first in the block, which means it contains the first cell as a block cell and we need to indent the cell index when changing names in hierarchical column
            //currentRowArray = HierarchyBase.stripRowData(row,firstInBlock,block);
        result[compoundID] = new HierarchyRowMeta({
          row,
          block: block,
          id: compoundID,
          flatName: item.text.trim(),
          name: item.name.trim(),//flatName,
          nameCell: row.children.item(block!==null ? (firstInBlock? this.column+1: this.column) : this.column),
          parent: parent,
          rowIndex: rowheaders[compoundID].index,
          level,
          collapsed: item.subcells.length > 0,
          hasChildren: item.subcells.length > 0,
          hidden: level > 0
        });

        row.classList.add("level" + level.toString());

        if(parent!=null){
          if(!parent.children)parent.children=[];
          parent.children.push(result[compoundID]);
        }

        if (level > 0 && clearLinks) {
          TAhierarchy.clearLink(row);
        }

        TAhierarchy.addCollapseButton(result[compoundID]);
        // initializes row headers according to `this.flat`
        TAhierarchy.updateCategoryLabel.call(result[compoundID],this.flat,this.column);

        if(level < 2)TAhierarchy.parseHierarchy.call(this,{hierarchy:item.subcells, rowheaders, level:level + 1, block, rows, result, parent:result[compoundID], clearLinks});
      }
    });
  }

}



export default TAhierarchy;
