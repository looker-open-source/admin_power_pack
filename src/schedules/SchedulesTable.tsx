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
  Button,
  ButtonOutline,
  Checkbox,
  ComboboxOptionObject,
  FieldCheckbox,
  Flex,
  FlexItem,
  Heading,
  InputText,
  Paragraph,
  Popover,
  PopoverContent,
  Select,
  Space,
  SpaceVertical,
  Status,
  Table,
  TableBody,
  TableDataCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TextArea,
} from "@looker/components";
import { useTable, useRowSelect } from "react-table";
import { mapValues } from "lodash";
import { Styles } from "./Styles";
import { translateCron } from "./cronHelper";
import { IScheduledPlanTable } from "./SchedulesPage";
import {
  DEBUG,
  READ_ONLY_FIELDS,
  SELECT_FIELDS,
  CHECKBOX_FIELDS,
  FORMATTING_FIELDS,
  TEXTAREA_FIELDS,
  KEY_FIELDS,
  TABLE_HEADING,
  TIMEZONES,
  FORMAT,
  PDF_PAPER_SIZE,
} from "./constants";

export interface QueryProps {
  results: IScheduledPlanTable;
  datagroups: ComboboxOptionObject[];
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
  openDashboardWindow(rowIndex: number): void;
}

export interface EditableCellInterface {
  value: any; // (string | boolean)
  row: { index: number };
  column: { id: string };
  data: any;
  datagroups: ComboboxOptionObject[];
  openExploreWindow(scheduledPlanID: number): void;
  openDashboardWindow(rowIndex: number): void;
  syncData(rowIndex: number, columnId: string, value: string): any;
}

// returns {rowIndex3: scheduleId3, rowIndex2: scheduleId2, etc.}
const zipRows = (selectedFlatRows: any, selectedRowIds: any) => {
  const scheduleIds = selectedFlatRows.map((d: any) => d.original.details.id);
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
        <Checkbox
          marginLeft="auto"
          marginRight="auto"
          ref={resolvedRef}
          {...rest}
        />
      </>
    );
  }
);

const EditableCell = (ec: EditableCellInterface) => {
  const {
    value: initialValue,
    row: { index },
    column: { id },
    data,
    datagroups,
    openExploreWindow,
    openDashboardWindow,
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
        marginLeft="auto"
        marginRight="auto"
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

  const CronInputText = (disabled: boolean): JSX.Element => {
    const tooltip = translateCron(value);
    let intent: "critical" | "positive";

    if (tooltip === "Not a valid cron expression") {
      intent = "critical";
    } else {
      intent = "positive";
    }

    return (
      <Flex title={tooltip}>
        <InputText
          width={1}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
        />
        {!disabled && value.length > 0 && (
          <Box m="xsmall">
            <Status intent={intent} />
          </Box>
        )}
      </Flex>
    );
  };

  const DefaultTextArea = (): JSX.Element => {
    return (
      <TextArea
        value={value}
        key={id + index}
        minHeight="36px"
        height="36px"
        onChange={onChange}
        onBlur={onBlur}
        resize
      />
    );
  };

  // Popover with details of scheduled run history and link to system activity
  const IdPopover = (): JSX.Element => {
    return (
      <>
        <Popover
          content={
            <PopoverContent p="large">
              <Heading as="h3">Details</Heading>
              <Paragraph fontSize="small">
                Created at: {value.created_at}
              </Paragraph>
              <Paragraph fontSize="small">
                Last updated at: {value.updated_at}
              </Paragraph>
              <Heading as="h3">Cron History</Heading>
              <Paragraph fontSize="small">
                Next Run at: {value.next_run_at}
              </Paragraph>
              <Paragraph fontSize="small">
                Last Run at: {value.last_run_at}
              </Paragraph>

              <Flex width="100%" height="10px"></Flex>

              <SpaceVertical gap="xsmall">
                <Button
                  // color={}
                  onClick={() => {
                    openExploreWindow(value.id);
                  }}
                  title="Scheduled Plan History in System Activity"
                >
                  Explore Schedule History
                </Button>

                <Button
                  // color={}
                  onClick={() => {
                    openDashboardWindow(index);
                  }}
                  title="View Dashboard with Filters Applied"
                >
                  Dashboard With Filters
                </Button>
              </SpaceVertical>
            </PopoverContent>
          }
        >
          <ButtonOutline>{value.id}</ButtonOutline>
        </Popover>
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
    if (id === "details") {
      return IdPopover();
    } else {
      return DefaultInputText(true);
    }
  } else if (TEXTAREA_FIELDS.includes(id)) {
    return DefaultTextArea();
  } else if (id === "crontab") {
    const isDatagroup = data[index].datagroup !== " ";
    return CronInputText(isDatagroup);
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
  openDashboardWindow,
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
      openDashboardWindow,
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
      <Flex height="25px" justifyContent="space-between">
        <Flex>
          <FlexItem alignSelf="center">
            <ButtonOutline
              size="xsmall"
              m="xsmall"
              color="key"
              iconBefore="Plus"
              title="Add row to table"
              onClick={() => {
                addRow();
              }}
            >
              Add
            </ButtonOutline>
          </FlexItem>

          <FlexItem alignSelf="center">
            <ButtonOutline
              disabled={!(Object.keys(selectedRowIds).length > 0)}
              size="xsmall"
              m="xsmall"
              color="critical"
              iconBefore="Trash"
              title="Delete row/schedule from table"
              onClick={() => {
                const rows = zipRows(selectedFlatRows, selectedRowIds);
                deleteRow(rows);
              }}
            >
              Delete
            </ButtonOutline>
          </FlexItem>

          <FlexItem alignSelf="center">
            <ButtonOutline
              disabled={!(Object.keys(selectedRowIds).length > 0)}
              size="xsmall"
              m="xsmall"
              iconBefore="Update"
              title="Create new schedule or update existing schedule"
              onClick={() => {
                const rowIndex = Object.keys(selectedRowIds).map(Number);
                const rows = selectedFlatRows.map((d) => d.original);
                updateRow(rowIndex, rows);
              }}
            >
              Create/Update
            </ButtonOutline>
          </FlexItem>

          <FlexItem alignSelf="center">
            <ButtonOutline
              disabled={!(Object.keys(selectedRowIds).length > 0)}
              size="xsmall"
              m="xsmall"
              iconBefore="SendEmail"
              title='Run the schedule now. This is the same as "Send Test" in the UI'
              onClick={() => {
                const rowIndex = Object.keys(selectedRowIds).map(Number);
                const rows = selectedFlatRows.map((d) => d.original);
                testRow(rowIndex, rows);
              }}
            >
              Run Once
            </ButtonOutline>
          </FlexItem>

          <FlexItem alignSelf="center">
            <ButtonOutline
              disabled={!(Object.keys(selectedRowIds).length > 0)}
              size="xsmall"
              m="xsmall"
              iconBefore="Block"
              title="Disable the schedule and prevent the schedule from sending until it’s re-enabled"
              onClick={() => {
                const rowIndex = Object.keys(selectedRowIds).map(Number);
                const rows = selectedFlatRows.map((d) => d.original);
                disableRow(rowIndex, rows);
              }}
            >
              Disable
            </ButtonOutline>
          </FlexItem>

          <FlexItem alignSelf="center">
            <ButtonOutline
              disabled={!(Object.keys(selectedRowIds).length > 0)}
              size="xsmall"
              m="xsmall"
              iconBefore="CheckProgress"
              title="Enable the schedule. Re-enabling a schedule will send (maximum 1) schedule immediately, if, while it was disabled it should have run"
              onClick={() => {
                const rowIndex = Object.keys(selectedRowIds).map(Number);
                const rows = selectedFlatRows.map((d) => d.original);
                enableRow(rowIndex, rows);
              }}
            >
              Enable
            </ButtonOutline>
          </FlexItem>

          <FlexItem p="small"></FlexItem>

          <FlexItem alignSelf="center">
            <Space>
              <FieldCheckbox
                label="Show All"
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
              />

              {headers.map((header: any) => {
                if (header.originalId === "selection_placeholder") {
                  return;
                }
                return (
                  <FieldCheckbox
                    key={header.id}
                    label={header.Header}
                    checked={checkboxStatus[header.Header]}
                    onChange={(e: any) => {
                      const newCheckboxStatus = checkboxStatus;
                      newCheckboxStatus[header.Header] = !newCheckboxStatus[
                        header.Header
                      ];
                      const headerColumns = header.columns.map(
                        (c: any) => c.id
                      );
                      let newHiddenColumns = [];

                      if (!e.target.checked) {
                        newHiddenColumns = [
                          ...hiddenColumnsState,
                          ...headerColumns,
                        ];
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
                  />
                );
              })}
            </Space>
          </FlexItem>
        </Flex>

        <Flex>
          <FlexItem alignSelf="center">
            {Object.keys(selectedRowIds).length > 0 && (
              <p style={{ float: "right" }}>
                {Object.keys(selectedRowIds).length} row(s) selected
              </p>
            )}
          </FlexItem>
        </Flex>
      </Flex>

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

        {/* JSON output of rows selected */}
        {/* <pre>
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
        </pre> */}
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

  const filterHeadings: Object[] = Object.keys(results[0])
    .filter((item) => !KEY_FIELDS.includes(item)) // remove all key fields and put them in order below
    .map((key) => ({
      Header: key.charAt(0).toUpperCase() + key.slice(1), // format filter columns
      accessor: key,
    }));

  const formattedHeadings = [...TABLE_HEADING, ...filterHeadings];

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
    openDashboardWindow,
  } = qp;

  return (
    <Box width={1}>
      {results.length > 0 && (
        <ReactTable
          columns={headings(results)}
          data={results}
          datagroups={datagroups}
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
          openDashboardWindow={openDashboardWindow}
        />
      )}
    </Box>
  );
};
