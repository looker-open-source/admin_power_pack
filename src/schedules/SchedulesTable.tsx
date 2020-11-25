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
  ButtonTransparent,
  Checkbox,
  Confirm,
  FieldCheckbox,
  Flex,
  FlexItem,
  Heading,
  Icon,
  InputText,
  InputChips,
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
import { translateCron, newOptions, newGroupOptions } from "./helper";
import {
  DEBUG,
  KEY_FIELDS,
  TABLE_HEADING,
  TIMEZONES,
  FORMAT,
  PDF_PAPER_SIZE,
  SelectOption,
  GroupSelectOption,
  SchedulesTableQueryProps,
  EditableCellProps,
} from "./constants";

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

const EditableCell = (ec: EditableCellProps) => {
  const {
    value: initialValue,
    row: { index },
    column: { id },
    data,
    datagroups,
    users,
    openExploreDrillWindow,
    openDashboardWindow,
    syncData,
  } = ec;

  const [value, setValue] = React.useState(initialValue);
  const [searchTerm, setSearchTerm] = React.useState("");

  // If the initialValue is changed external, sync it up with our state
  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // only update the schedulesArrayBackup when the input is blurred
  const onBlur = () => {
    syncData(index, id, value);
  };

  const onChange = (e: any) => {
    setValue(e.target.value);
  };

  const onSelectChange = (e: any) => {
    setValue(e);
    syncData(index, id, e);
  };

  const handleSelectFilter = (term: string) => {
    setSearchTerm(term);
  };

  const DefaultSelect = (
    options: any,
    disabled: boolean,
    isClearable: boolean
  ): JSX.Element => {
    return (
      <Select
        width={1}
        autoResize
        value={value}
        title={value}
        listLayout={{ width: "auto" }}
        options={options}
        disabled={disabled}
        onChange={onSelectChange} // handles syncData() no onBlur needed
        onFilter={handleSelectFilter}
        isFilterable
        isClearable={isClearable}
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

  const DefaultInputText = (): JSX.Element => {
    return (
      <InputText
        width={1}
        minWidth={100}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
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
          minWidth={100}
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
        minHeight={36}
        height={36}
        minWidth={100}
        onChange={onChange}
        onBlur={onBlur}
        resize
      />
    );
  };

  const RecipientsInputChips = (): JSX.Element => {
    const [invalidValue, setInvalidValue] = React.useState("");
    const [duplicateValue, setDuplicateValue] = React.useState("");

    const emailValidator = new RegExp(
      /^(([^<>()\[\]\\.,:\s@"]+(\.[^<>()\[\]\\.,:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );

    function handleChange(newValues: string[]) {
      setValue(newValues);
      setInvalidValue("");
      setDuplicateValue("");
    }
    function validate(valueToValidate: string) {
      return emailValidator.test(valueToValidate);
    }
    function handleInvalid(invalidValue: string[]) {
      setInvalidValue(invalidValue[0]);
    }
    function handleDuplicate(duplicateValue: string[]) {
      setDuplicateValue(duplicateValue[0]);
    }

    return (
      <>
        <InputChips
          values={value}
          validate={validate}
          onChange={handleChange}
          onValidationFail={handleInvalid}
          onDuplicate={handleDuplicate}
          onBlur={() => {
            onBlur();
            handleChange(value);
          }}
        />
        <Paragraph fontSize="small" variant="critical">
          {invalidValue !== ""
            ? `Invalid email: ${invalidValue}`
            : duplicateValue !== ""
            ? `${duplicateValue} has already been entered`
            : ""}
        </Paragraph>
      </>
    );
  };

  // Popover with details of scheduled run history and link to system activity
  const IdPopover = (): JSX.Element => {
    let icon: any = {};

    if (value.enabled) {
      icon.name = "CheckProgress";
      icon.color = "key";
      icon.size = "small";
    } else {
      icon.name = "Block";
      icon.color = "neutral";
      icon.size = "xsmall";
    }

    return (
      <>
        <Popover
          content={
            <PopoverContent p="large">
              <Heading as="h2">{data[index].name}</Heading>
              <Paragraph fontSize="small">
                Created at: {value.created_at}
              </Paragraph>
              <Paragraph fontSize="small">
                Last updated at: {value.updated_at}
              </Paragraph>
              <Heading as="h3">Cron Details</Heading>
              <Paragraph fontSize="small" maxWidth="350px">
                {translateCron(data[index].crontab)}
              </Paragraph>
              <Paragraph fontSize="small">
                Next Run at:{" "}
                {value.enabled
                  ? value.next_run_at
                  : "Schedule Plan is disabled"}
              </Paragraph>
              <Paragraph fontSize="small">
                Last Run at: {value.last_run_at}
              </Paragraph>
              <Flex width="100%" height="10px"></Flex>
              <SpaceVertical gap="xsmall">
                <Button
                  // color={}
                  onClick={() => {
                    openExploreDrillWindow(value.id);
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
          <ButtonTransparent
            fullWidth
            color={icon.color}
            disabled={value == ""}
          >
            {value == "" ? "New" : value.id}
            {value == "" ? (
              ""
            ) : (
              <Icon m="xxsmall" size={icon.size} name={icon.name} />
            )}
          </ButtonTransparent>
        </Popover>
      </>
    );
  };

  const isPDF = (): boolean => {
    return ["wysiwyg_pdf", "assembled_pdf"].includes(data[index].format);
  };

  const isCsv = (): boolean => {
    return data[index].format === "csv_zip";
  };

  const isPaperSize = (): boolean => {
    return data[index].pdf_paper_size !== "";
  };

  const isCrontab = data[index].crontab !== "";

  const isDatagroup = data[index].datagroup !== "";

  switch (id) {
    // SELECT_FIELDS //
    case "datagroup":
      return DefaultSelect(newOptions(searchTerm, datagroups), isCrontab, true);
    case "owner_id":
      return DefaultSelect(newOptions(searchTerm, users), false, true);
    case "timezone":
      return DefaultSelect(
        newGroupOptions(searchTerm, TIMEZONES),
        !isCrontab,
        true
      );
    case "format":
      return DefaultSelect(newOptions(searchTerm, FORMAT), false, false);
    case "pdf_paper_size":
      return DefaultSelect(
        newOptions(searchTerm, PDF_PAPER_SIZE),
        !isPDF(),
        true
      );

    // CHECKBOX_FIELDS //
    case "include_links":
      return DefaultCheckbox(false);
    case "run_as_recipient":
      return DefaultCheckbox(false);
    case "apply_formatting":
      return DefaultCheckbox(!isCsv());
    case "apply_vis":
      return DefaultCheckbox(!isCsv());
    case "long_tables":
      return DefaultCheckbox(!isPDF());
    case "pdf_landscape":
      return DefaultCheckbox(!isPDF() || !isPaperSize());

    // READ_ONLY_FIELDS //
    case "details":
      return IdPopover();

    // TEXTAREA_FIELDS //
    case "message":
      return DefaultTextArea();

    // INPUTCHIPS FIELDS//
    case "recipients":
      return RecipientsInputChips();

    // CRONTAB AND INPUT_TEXT FIELDS //
    case "crontab":
      return CronInputText(isDatagroup);
    case "name":
      return DefaultInputText();

    // Filters will be DefaultInputText //
    default:
      return DefaultInputText();
  }
};

const defaultColumn = {
  Cell: EditableCell,
};

const ReactTable = ({
  columns,
  data,
  datagroups,
  users,
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
  openExploreDrillWindow,
  openDashboardWindow,
  toggleLog,
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
      users,
      syncData,
      defaultColumn,
      openExploreDrillWindow,
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
            <Confirm
              confirmLabel="Delete"
              buttonColor="critical"
              title="Delete Rows"
              message={`Are you sure you want to delete these ${
                Object.keys(selectedRowIds).length
              } schedules?`}
              onConfirm={(close) => {
                const rows = zipRows(selectedFlatRows, selectedRowIds);
                deleteRow(rows);
                close();
                toggleLog();
              }}
            >
              {(open) => (
                <ButtonOutline
                  disabled={!(Object.keys(selectedRowIds).length > 0)}
                  size="xsmall"
                  m="xsmall"
                  color="critical"
                  iconBefore="Trash"
                  title="Delete row/schedule from table"
                  onClick={open}
                >
                  Delete
                </ButtonOutline>
              )}
            </Confirm>
          </FlexItem>

          <FlexItem alignSelf="center">
            <Confirm
              confirmLabel="Yes"
              buttonColor="key"
              title="Create and Update Rows"
              message={`Are you sure you want to create / update these ${
                Object.keys(selectedRowIds).length
              } schedules?`}
              onConfirm={(close) => {
                const rowIndex = Object.keys(selectedRowIds).map(Number);
                const rows = selectedFlatRows.map((d) => d.original);
                updateRow(rowIndex, rows);
                close();
                toggleLog();
              }}
            >
              {(open) => (
                <ButtonOutline
                  disabled={!(Object.keys(selectedRowIds).length > 0)}
                  size="xsmall"
                  m="xsmall"
                  iconBefore="Update"
                  title="Create new schedule or update existing schedule"
                  onClick={open}
                >
                  Create/Update
                </ButtonOutline>
              )}
            </Confirm>
          </FlexItem>

          <FlexItem alignSelf="center">
            <Confirm
              confirmLabel="Yes"
              buttonColor="key"
              title="Run Schedules Now"
              message={`Are you sure you want to run these ${
                Object.keys(selectedRowIds).length
              } schedules now?`}
              onConfirm={(close) => {
                const rowIndex = Object.keys(selectedRowIds).map(Number);
                const rows = selectedFlatRows.map((d) => d.original);
                testRow(rowIndex, rows);
                close();
                toggleLog();
              }}
            >
              {(open) => (
                <ButtonOutline
                  disabled={!(Object.keys(selectedRowIds).length > 0)}
                  size="xsmall"
                  m="xsmall"
                  iconBefore="SendEmail"
                  title='Run the schedule now. This is the same as "Send Test" in the UI'
                  onClick={open}
                >
                  Run Once
                </ButtonOutline>
              )}
            </Confirm>
          </FlexItem>

          <FlexItem alignSelf="center">
            <Confirm
              confirmLabel="Yes"
              buttonColor="key"
              title="Disable Schedules"
              message={`Are you sure you want to disable these ${
                Object.keys(selectedRowIds).length
              } schedules?`}
              onConfirm={(close) => {
                const rowIndex = Object.keys(selectedRowIds).map(Number);
                const rows = selectedFlatRows.map((d) => d.original);
                disableRow(rowIndex, rows);
                close();
                toggleLog();
              }}
            >
              {(open) => (
                <ButtonOutline
                  disabled={!(Object.keys(selectedRowIds).length > 0)}
                  size="xsmall"
                  m="xsmall"
                  iconBefore="Block"
                  title="Disable the schedule and prevent the schedule from sending until it’s re-enabled"
                  onClick={open}
                >
                  Disable
                </ButtonOutline>
              )}
            </Confirm>
          </FlexItem>

          <FlexItem alignSelf="center">
            <Confirm
              confirmLabel="Yes"
              buttonColor="key"
              title="Enable Schedules"
              message={`Are you sure you want to enable these ${
                Object.keys(selectedRowIds).length
              } schedules?`}
              onConfirm={(close) => {
                const rowIndex = Object.keys(selectedRowIds).map(Number);
                const rows = selectedFlatRows.map((d) => d.original);
                enableRow(rowIndex, rows);
                close();
                toggleLog();
              }}
            >
              {(open) => (
                <ButtonOutline
                  disabled={!(Object.keys(selectedRowIds).length > 0)}
                  size="xsmall"
                  m="xsmall"
                  iconBefore="CheckProgress"
                  title="Enable the schedule. Re-enabling a schedule will send (maximum 1) schedule immediately, if, while it was disabled it should have run"
                  onClick={open}
                >
                  Enable
                </ButtonOutline>
              )}
            </Confirm>
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
                    // always show details
                    newHiddenColumns = Object.keys(data[0]).filter(
                      (c: any) => c !== "details"
                    );
                  }
                  handleVisible(newHiddenColumns, newCheckboxStatus);
                }}
                // {...getToggleHideAllColumnsProps()}
              />

              {headers.map((header: any) => {
                if (
                  header.originalId === "selection_placeholder" ||
                  header.originalId === " "
                ) {
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
                      color="neutral"
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
        {DEBUG && (
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
        )}
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
    { Header: " ", columns: formattedHeadings.slice(0, 1) },
    { Header: "Required", columns: formattedHeadings.slice(1, 6) },
    { Header: "Advanced", columns: formattedHeadings.slice(6, 11) },
    { Header: "Formatting", columns: formattedHeadings.slice(11, 16) },
    { Header: "Filters", columns: formattedHeadings.slice(16) },
  ];
  // console.log(groupedHeadings);

  return groupedHeadings;
};

export const SchedulesTable = (qp: SchedulesTableQueryProps): JSX.Element => {
  const {
    results,
    datagroups,
    users,
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
    openExploreDrillWindow,
    openDashboardWindow,
    toggleLog,
  } = qp;

  return (
    <Box width={1}>
      {results.length > 0 && (
        <ReactTable
          columns={headings(results)}
          data={results}
          datagroups={datagroups}
          users={users}
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
          openExploreDrillWindow={openExploreDrillWindow}
          openDashboardWindow={openDashboardWindow}
          toggleLog={toggleLog}
        />
      )}
    </Box>
  );
};
