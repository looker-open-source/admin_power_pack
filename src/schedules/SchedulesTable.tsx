/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2020 Looker Data Sciences, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import React from "react";
import {
  Box,
  ButtonTransparent,
  Checkbox,
  ComboboxOptionObject,
  InputText,
  InputChips,
  Label,
  Select,
  Text,
  Table,
  TableBody,
  TableDataCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TextArea,
} from "@looker/components";
import styled from "styled-components";
import { useTable, useRowSelect } from "react-table";
import { mapValues } from "lodash";
import cronstrue from "cronstrue";
import { Styles } from "./Styles";
import {
  READ_ONLY_FIELDS,
  SELECT_FIELDS,
  CHECKBOX_FIELDS,
  FORMATTING_FIELDS,
  TEXTAREA_FIELDS,
  KEY_FIELDS,
  IScheduledPlanTable,
} from "./SchedulesPage";
import { TIMEZONES, FORMAT, PDF_PAPER_SIZE } from "./selectOptions";

export interface QueryProps {
  results: IScheduledPlanTable;
  datagroups: ComboboxOptionObject[];
  runningQuery: boolean;
  runningUpdate: boolean;
  hiddenColumns: string[];
  checkboxStatus: any;
  handleVisible(hiddenColumns: string[], checkboxStatus: any): void;
  syncData(index: number, id: string, value: string): any;
  addRow(): void;
  deleteRow(rows: any[]): void;
  updateRow(rowIndex: number[], rows: any[]): void;
  testRow(rowIndex: number[], rows: any[]): void;
  disableRow(rowIndex: number[], rows: any[]): void;
  enableRow(rowIndex: number[], rows: any[]): void;
  openExploreWindow(scheduledPlanID: number): void;
}

export interface EditableCellInterface {
  value: any; // (string | boolean)
  row: { index: number };
  column: { id: string };
  data: any;
  datagroups: ComboboxOptionObject[];
  openExploreWindow(scheduledPlanID: number): void;
  syncData(rowIndex: number, columnId: string, value: string): any;
}

// returns {rowIndex3: scheduleId3, rowIndex2: scheduleId2, etc.}
const zipRows = (selectedFlatRows: any, selectedRowIds: any) => {
  const scheduleIds = selectedFlatRows.map((d: any) => d.original.id);
  const rowIndex = Object.keys(selectedRowIds);
  const rows = [];
  for (let i = 0; i < scheduleIds.length; i++) {
    rows.push({ rowIndex: rowIndex[i], scheduleId: scheduleIds[i] });
  }
  return rows.reverse();
};

// todo fix indeterminate state for header
const IndeterminateCheckbox = React.forwardRef(
  ({ indeterminate, ...rest }: any, ref) => {
    const defaultRef = React.useRef();
    const resolvedRef: any = ref || defaultRef;

    React.useEffect(() => {
      resolvedRef.current.indeterminate = indeterminate;
    }, [resolvedRef, indeterminate]);

    return (
      <>
        <Checkbox ref={resolvedRef} {...rest} />
      </>
    );
  }
);

const translateCron = (cron: string): string => {
  // console.log(cron);
  try {
    const expression = cronstrue.toString(cron);
    return expression;
  } catch (error) {
    return "Not a valid cron expression";
  }
};

const EditableCell = (ec: EditableCellInterface) => {
  const {
    value: initialValue,
    row: { index },
    column: { id },
    data,
    datagroups,
    openExploreWindow,
    syncData,
  } = ec;

  // We need to keep and update the state of the cell normally
  const [value, setValue] = React.useState(initialValue);

  const DefaultSelect = (options: any, disabled: boolean): JSX.Element => {
    return (
      <Select
        width={1}
        value={value}
        title={value}
        options={options}
        disabled={disabled}
        onChange={onSelectChange}
        onBlur={onBlur}
      />
    );
  };

  const DefaultCheckbox = (disabled: boolean): JSX.Element => {
    return (
      <Checkbox
        mr="xsmall"
        checked={value}
        disabled={disabled}
        onChange={(e: any) => {
          setValue(e.target.checked);
        }}
        onBlur={onBlur}
      />
    );
  };

  const DefaultInputText = (disabled: boolean): JSX.Element => {
    return (
      <InputText
        width={1}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
      />
    );
  };

  const DefaultTextArea = (): JSX.Element => {
    // override initial height
    const StyledTextArea = styled(TextArea)`
      textarea {
        min-height: 36px;
        height: 36px;
      }
    `;

    return (
      // <StyledTextArea // this doesnt work, onChange looses focus with each key stroke
      <TextArea // this works but min-height is 6.25rem
        width={1}
        value={value}
        key={id + index}
        // onChange={(e: any) => {
        //   console.log(id + index);
        //   console.log(e.target);
        //   setValue(e.target.value);
        //   debugger;
        // }}
        onChange={onChange}
        onBlur={onBlur}
        resize="both"
      />
    );
  };

  // covering DefaultInputText with Box with link
  const IdInputText = (): JSX.Element => {
    return (
      <>
        <Box
          onClick={() => {
            openExploreWindow(value);
          }}
          cursor={"pointer"}
          title={"Scheduler History in System Activity"}
          display={"inline-block"}
          position={"relative"}
        >
          <DefaultInputText {...true} />
          <Box position={"absolute"} left={0} right={0} top={0} bottom={0} />
        </Box>
      </>
    );
  };

  const onChange = (e: any) => {
    setValue(e.target.value);
  };

  const onSelectChange = (e: string) => {
    setValue(e);
  };

  // We'll only update the external data when the input is blurred
  const onBlur = () => {
    syncData(index, id, value);
  };

  // If the initialValue is changed external, sync it up with our state
  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  if (SELECT_FIELDS.includes(id)) {
    if (id === "datagroup") {
      const isCrontab = data[index].crontab !== "";
      return DefaultSelect(datagroups, isCrontab);
    } else if (id === "timezone") {
      return DefaultSelect(TIMEZONES, false);
    } else if (id === "format") {
      return DefaultSelect(FORMAT, false);
    } else if (id === "pdf_paper_size") {
      const isPDF = ["wysiwyg_pdf", "assembled_pdf"].includes(
        data[index].format
      );
      return DefaultSelect(PDF_PAPER_SIZE, !isPDF);
    }
  } else if (CHECKBOX_FIELDS.includes(id)) {
    if (FORMATTING_FIELDS.includes(id)) {
      const isPDF = ["wysiwyg_pdf", "assembled_pdf"].includes(
        data[index].format
      );
      const isCsv = data[index].format === "csv_zip";
      const isPaperSize = data[index].pdf_paper_size !== "";
      if ((id === "apply_formatting" || id === "apply_vis") && !isCsv) {
        return DefaultCheckbox(true);
      } else if (id === "long_tables" && !isPDF) {
        return DefaultCheckbox(true);
      } else if (id === "pdf_landscape" && (!isPDF || !isPaperSize)) {
        return DefaultCheckbox(true);
      } else {
        return DefaultCheckbox(false);
      }
    } else if (id === "enabled") {
      return DefaultCheckbox(true);
    } else {
      return DefaultCheckbox(false); // include_links, run_as_recipient
    }
  } else if (READ_ONLY_FIELDS.includes(id)) {
    if (id === "id") {
      return IdInputText();
    } else {
      return DefaultInputText(true);
    }
  } else if (TEXTAREA_FIELDS.includes(id)) {
    return DefaultTextArea();
  } else if (id === "crontab") {
    const isDatagroup = data[index].datagroup !== " ";
    return DefaultInputText(isDatagroup);
  } else {
    return DefaultInputText(false);
  }
};

const defaultColumn = {
  Cell: EditableCell,
};

const ReactTable = ({
  columns,
  data,
  datagroups,
  runningQuery,
  runningUpdate,
  hiddenColumnsState,
  handleVisible,
  checkboxStatus,
  syncData,
  addRow,
  deleteRow,
  updateRow,
  testRow,
  disableRow,
  enableRow,
  openExploreWindow,
}: any): JSX.Element => {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    headers,
    rows,
    prepareRow,
    selectedFlatRows,
    setHiddenColumns,
    // getToggleHideAllColumnsProps,
    // visibleColumns,
    // hiddenColumns,
    state: { selectedRowIds },
  } = useTable(
    {
      columns,
      data,
      datagroups,
      syncData,
      defaultColumn,
      openExploreWindow,
    },
    useRowSelect,
    (hooks) => {
      hooks.visibleColumns.push((columns: any) => [
        {
          id: "selection",
          Header: ({ getToggleAllRowsSelectedProps }: any) => (
            <Box>
              <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
            </Box>
          ),

          Cell: ({ row }: any) => (
            <Box>
              <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
            </Box>
          ),
        },
        ...columns,
      ]);
    }
  );

  React.useEffect(() => {
    setHiddenColumns(hiddenColumnsState);
  }, [columns]);

  // console.log(hiddenColumnsState);
  // console.log(headerGroups);
  // console.log(headers);
  // console.log(visibleColumns);
  // console.log(hiddenColumns);
  // console.log(checkboxStatus);
  // console.table(columns);
  // console.table(data);

  return (
    <>
      <ButtonTransparent
        size="xsmall"
        m="xsmall"
        color="primary"
        iconBefore="Plus"
        onClick={() => {
          addRow();
        }}
      >
        Add
      </ButtonTransparent>
      <ButtonTransparent
        disabled={!(Object.keys(selectedRowIds).length > 0)}
        size="xsmall"
        m="xsmall"
        color="danger"
        iconBefore="Trash"
        onClick={() => {
          const rows = zipRows(selectedFlatRows, selectedRowIds);
          deleteRow(rows);
        }}
      >
        Delete
      </ButtonTransparent>
      <ButtonTransparent
        disabled={!(Object.keys(selectedRowIds).length > 0)}
        size="xsmall"
        m="xsmall"
        iconBefore="Update"
        onClick={() => {
          const rowIndex = Object.keys(selectedRowIds).map(Number);
          const rows = selectedFlatRows.map((d) => d.original);
          updateRow(rowIndex, rows);
        }}
      >
        Create/Update
      </ButtonTransparent>
      <ButtonTransparent
        disabled={!(Object.keys(selectedRowIds).length > 0)}
        size="xsmall"
        m="xsmall"
        iconBefore="SendEmail"
        onClick={() => {
          const rowIndex = Object.keys(selectedRowIds).map(Number);
          const rows = selectedFlatRows.map((d) => d.original);
          testRow(rowIndex, rows);
        }}
      >
        Run Once
      </ButtonTransparent>

      <ButtonTransparent
        disabled={!(Object.keys(selectedRowIds).length > 0)}
        size="xsmall"
        m="xsmall"
        iconBefore="Close"
        onClick={() => {
          const rowIndex = Object.keys(selectedRowIds).map(Number);
          const rows = selectedFlatRows.map((d) => d.original);
          disableRow(rowIndex, rows);
        }}
      >
        Disable
      </ButtonTransparent>

      <ButtonTransparent
        disabled={!(Object.keys(selectedRowIds).length > 0)}
        size="xsmall"
        m="xsmall"
        iconBefore="FolderOpen"
        onClick={() => {
          const rowIndex = Object.keys(selectedRowIds).map(Number);
          const rows = selectedFlatRows.map((d) => d.original);
          enableRow(rowIndex, rows);
        }}
      >
        Enable
      </ButtonTransparent>

      <Label>
        <Checkbox
          checked={checkboxStatus["Show All"]}
          onChange={(e: any) => {
            let newCheckboxStatus = checkboxStatus;
            if (checkboxStatus["Show All"] !== true) {
              newCheckboxStatus = mapValues(checkboxStatus, () => true);
            } else {
              newCheckboxStatus = mapValues(checkboxStatus, () => false);
            }

            let newHiddenColumns: string[] = [];
            if (newCheckboxStatus["Show All"]) {
              newHiddenColumns = [];
            } else {
              newHiddenColumns = Object.keys(data[0]);
            }
            handleVisible(newHiddenColumns, newCheckboxStatus);
          }}
          // {...getToggleHideAllColumnsProps()}
        />{" "}
        Show All
      </Label>

      {headers.map((header: any) => {
        if (header.originalId === "selection_placeholder") {
          return;
        }
        return (
          <Label key={header.id}>
            <Checkbox
              checked={checkboxStatus[header.Header]}
              onChange={(e: any) => {
                const newCheckboxStatus = checkboxStatus;
                newCheckboxStatus[header.Header] = !newCheckboxStatus[
                  header.Header
                ];
                const headerColumns = header.columns.map((c: any) => c.id);
                let newHiddenColumns = [];

                if (!e.target.checked) {
                  newHiddenColumns = [...hiddenColumnsState, ...headerColumns];
                } else {
                  newHiddenColumns = [...hiddenColumnsState].filter(
                    (c) => !headerColumns.includes(c)
                  );
                }

                if (newHiddenColumns.length == 0) {
                  newCheckboxStatus["Show All"] = true;
                } else if (
                  newHiddenColumns.length > 0 &&
                  newHiddenColumns.length < Object.keys(data[0]).length
                ) {
                  newCheckboxStatus["Show All"] = "mixed";
                } else {
                  newCheckboxStatus["Show All"] = false;
                }

                handleVisible(newHiddenColumns, newCheckboxStatus);
              }}
              // {...header.getToggleHiddenProps()}
            />{" "}
            {header.Header}
          </Label>
        );
      })}

      {runningQuery && (
        <Text color="palette.charcoal700" fontWeight="semiBold" mr="large">
          {" "}
          Getting Schedules Data ...
        </Text>
      )}
      {runningUpdate && (
        <Text color="palette.charcoal700" fontWeight="semiBold" mr="large">
          {" "}
          Processing ...
        </Text>
      )}
      {Object.keys(selectedRowIds).length > 0 && (
        <p style={{ float: "right" }}>
          {Object.keys(selectedRowIds).length} row(s) selected
        </p>
      )}
      <Styles>
        <Box>
          <Table {...getTableProps()}>
            <TableHead>
              {headerGroups.map((headerGroup) => (
                <TableRow {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map((column) => (
                    <TableHeaderCell
                      fontSize="small"
                      fontWeight="bold"
                      color="palette.charcoal500"
                      {...column.getHeaderProps()}
                    >
                      {column.render("Header")}
                    </TableHeaderCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody {...getTableBodyProps()}>
              {rows.map((row, i) => {
                prepareRow(row);
                return (
                  <TableRow {...row.getRowProps()}>
                    {row.cells.map((cell) => {
                      if (cell.column.Header === "Crontab") {
                        return (
                          <TableDataCell
                            title={translateCron(cell.value)}
                            {...cell.getCellProps()}
                          >
                            {cell.render("Cell")}
                          </TableDataCell>
                        );
                      }
                      return (
                        <TableDataCell {...cell.getCellProps()}>
                          {cell.render("Cell")}
                        </TableDataCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>

        <pre>
          <code>
            {JSON.stringify(
              {
                selectedRowIds: selectedRowIds,
                "selectedFlatRows[].original": selectedFlatRows.map(
                  (d) => d.original
                ),
              },
              null,
              2
            )}
          </code>
        </pre>
      </Styles>
    </>
  );
};

// return 'Header' and 'accessor' for column headers
// https://github.com/tannerlinsley/react-table/blob/master/docs/api/useTable.md#column-options
const headings = (results?: any): Array<Object> => {
  if (!results || !results.length || results.length === 0) {
    return [];
  }

  const formattedHeadings: Object[] = Object.keys(results[0])
    .filter((item) => !KEY_FIELDS.includes(item)) // move headers around
    .map((key) => ({
      Header: key.charAt(0).toUpperCase() + key.slice(1),
      accessor: key,
    }));

  formattedHeadings.splice(
    0,
    0,
    {
      Header: "ID",
      accessor: "id",
    },
    {
      Header: "Enabled",
      accessor: "enabled",
    },
    {
      Header: "Owner",
      accessor: "owner",
    },
    {
      Header: "Owner ID",
      accessor: "owner_id",
    },
    {
      Header: "Name",
      accessor: "name",
    },
    {
      Header: "Crontab",
      accessor: "crontab",
    },
    {
      Header: "Datagroup",
      accessor: "datagroup",
    },
    {
      Header: "Recipients",
      accessor: "recipients",
    },
    {
      Header: "Message",
      accessor: "message",
    },
    {
      Header: "Run As Recipient",
      accessor: "run_as_recipient",
    },
    {
      Header: "Include Links",
      accessor: "include_links",
    },
    {
      Header: "Timezone",
      accessor: "timezone",
    },
    {
      Header: "Format",
      accessor: "format",
    },
    {
      Header: "Apply Vis",
      accessor: "apply_vis",
    },
    {
      Header: "Apply Formatting",
      accessor: "apply_formatting",
    },
    {
      Header: "Expand Tables",
      accessor: "long_tables",
    },
    {
      Header: "Paper Size",
      accessor: "pdf_paper_size",
    },
    {
      Header: "Landscape",
      accessor: "pdf_landscape",
    }
  );

  const groupedHeadings = [
    { Header: "Read-Only", columns: formattedHeadings.slice(0, 3) },
    { Header: "Required", columns: formattedHeadings.slice(3, 8) },
    { Header: "Advanced", columns: formattedHeadings.slice(8, 13) },
    { Header: "Formatting", columns: formattedHeadings.slice(13, 18) },
    { Header: "Filters", columns: formattedHeadings.slice(18) },
  ];
  // console.log(groupedHeadings);

  return groupedHeadings;
};

export const SchedulesTable = (qp: QueryProps): JSX.Element => {
  const {
    results,
    datagroups,
    runningQuery,
    runningUpdate,
    hiddenColumns,
    handleVisible,
    checkboxStatus,
    syncData,
    addRow,
    deleteRow,
    updateRow,
    testRow,
    disableRow,
    enableRow,
    openExploreWindow,
  } = qp;

  return (
    <Box m={"small"} width={"100%"}>
      {results.length > 0 && (
        <ReactTable
          columns={headings(results)}
          data={results}
          datagroups={datagroups}
          runningQuery={runningQuery}
          runningUpdate={runningUpdate}
          hiddenColumnsState={hiddenColumns}
          handleVisible={handleVisible}
          checkboxStatus={checkboxStatus}
          syncData={syncData}
          addRow={addRow}
          deleteRow={deleteRow}
          updateRow={updateRow}
          testRow={testRow}
          disableRow={disableRow}
          enableRow={enableRow}
          openExploreWindow={openExploreWindow}
        />
      )}
    </Box>
  );
};
