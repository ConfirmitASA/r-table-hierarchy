/**
 * Created by IvanP on 07.09.2016.
 */

import TableData from "r-aggregated-table/src/table-data";
import AggregatedTable from "r-aggregated-table";
import ReportalBase from "r-reporal-base/src/reportal-base";
import TAhierarchy from "./ta-hierarchy";
import TAhierarchyTable from "./ta-hierarchy-table";

window.Reportal = window.Reportal || {};
ReportalBase.mixin(window.Reportal,{
  TAhierarchy,
  TAhierarchy,
  AggregatedTable
});

export default Reportal
