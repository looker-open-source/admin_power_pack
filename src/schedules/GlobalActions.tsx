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
  ActionList,
  ActionListItem,
  ActionListItemColumn,
  Box,
  Button,
  ButtonTransparent,
  ConfirmLayout,
  Dialog,
  DialogContent,
  Flex,
  FlexItem,
  InputText,
  Link,
  List,
  ListItem,
  Menu,
  MenuDisclosure,
  MenuItem,
  MenuList,
  Paragraph,
  RadioGroup,
  Select,
  SelectMulti,
  Space,
  Spinner,
  Text,
} from "@looker/components";
import {
  ACTION_LIST_FAIL_COLUMNS,
  ACTION_LIST_SELECT_BY_QUERY_COLUMNS,
  GlobalActionQueryProps,
} from "./constants";
import { MonospaceTextArea } from "./helper";

// used for GlobalValidateRecentSchedules and GlobalSelectByQueryRun action list tables
const ActionListDataTable = (
  data: any,
  selections: any,
  setSelections: any,
  columns: any,
  tableType: string
): JSX.Element => {
  const onSelect = (selection: string) => {
    const s = String(selection);
    setSelections(
      selections.includes(s)
        ? selections.filter((item: string) => item !== s)
        : [...selections, s]
    );
  };

  const allSelectableItems = data.map((row: any) =>
    String(row["scheduled_plan.id"])
  );

  const onSelectAll = () => {
    setSelections(selections.length ? [] : allSelectableItems);
  };

  let items;

  switch (tableType) {
    case "Failures":
      items = data.map((row: any) => {
        return (
          <ActionListItem
            key={row["scheduled_plan.id"]}
            id={String(row["scheduled_plan.id"])}
          >
            <ActionListItemColumn>
              {row["scheduled_plan.id"]}
            </ActionListItemColumn>
            <ActionListItemColumn>
              {row["scheduled_job.name"]}
            </ActionListItemColumn>
            <ActionListItemColumn>
              {row["scheduled_job.id"]}
            </ActionListItemColumn>
            <ActionListItemColumn>
              {row["scheduled_job.finalized_time"]}
            </ActionListItemColumn>
            <ActionListItemColumn>{row["user.name"]}</ActionListItemColumn>
            <ActionListItemColumn>
              {row["scheduled_job.status_detail"]}
            </ActionListItemColumn>
            <ActionListItemColumn>
              {row["scheduled_plan.content_type_id"]}
            </ActionListItemColumn>
            <ActionListItemColumn>
              {row["scheduled_plan.destination_addresses"]}
            </ActionListItemColumn>
          </ActionListItem>
        );
      });
      break;

    case "SelectByQuery":
      items = data.map((row: any) => {
        return (
          <ActionListItem
            key={row["scheduled_plan.id"]}
            id={String(row["scheduled_plan.id"])}
          >
            <ActionListItemColumn>
              {row["scheduled_plan.id"]}
            </ActionListItemColumn>
            <ActionListItemColumn>
              {row["scheduled_plan.name"]}
            </ActionListItemColumn>
            <ActionListItemColumn>
              {row["scheduled_plan.enabled"]}
            </ActionListItemColumn>
            <ActionListItemColumn>
              {row["scheduled_plan.run_once"]}
            </ActionListItemColumn>
            <ActionListItemColumn>
              {row["scheduled_times"]}
            </ActionListItemColumn>
            <ActionListItemColumn>{row["user.name"]}</ActionListItemColumn>
            <ActionListItemColumn>{row["summary"]}</ActionListItemColumn>
            <ActionListItemColumn>
              {row["scheduled_plan.content_type_id"]}
            </ActionListItemColumn>
            <ActionListItemColumn>
              {row["scheduled_plan.destination_addresses"]}
            </ActionListItemColumn>
          </ActionListItem>
        );
      });
  }

  return (
    <ActionList
      key="action_list"
      select={{
        selectedItems: selections,
        onClickRowSelect: true,
        onSelect: onSelect,
        onSelectAll: onSelectAll,
        pageItems: allSelectableItems,
      }}
      columns={columns}
    >
      {items}
    </ActionList>
  );
};

export const GlobalActions = (qp: GlobalActionQueryProps): JSX.Element => {
  const {
    users,
    toggleLog,
    openExploreWindow,
    GlobalReassignOwnership,
    GlobalFindReplaceEmail,
    GlobalValidateRecentSchedules,
    GlobalResendRecentFailures,
    GlobalSelectByQuery,
    GlobalSelectByQueryRun,
  } = qp;

  const [isToggledGRO, setisToggledGRO] = React.useState(false); // GlobalReassignOwnership
  const [isToggledGFR, setisToggledGFR] = React.useState(false); // GlobalFindReplaceEmail
  const [isToggledVRS, setisToggledVRS] = React.useState(false); // GlobalValidateRecentSchedules
  const [isToggledRRF, setisToggledRRF] = React.useState(false); // GlobalResendRecentFailures
  const [isToggledSBQ, setisToggledSBQ] = React.useState(false); // GlobalSelectByQuery
  const [isToggledSBQR, setisToggledSBQR] = React.useState(false); // GlobalSelectByQueryRun
  const [runningQuery, setRunningQuery] = React.useState(false); // used for VRS and SBQ for running SA query

  const ToggleGRO = () => setisToggledGRO((on) => !on);
  const ToggleGFR = () => setisToggledGFR((on) => !on);
  const ToggleVRS = () => setisToggledVRS((on) => !on);
  const ToggleRRF = () => setisToggledRRF((on) => !on);
  const ToggleSBQ = () => setisToggledSBQ((on) => !on);
  const ToggleSBQR = () => setisToggledSBQR((on) => !on);

  const [UserMapFrom, setUserMapFrom] = React.useState([]);
  const [UserMapTo, setUserMapTo] = React.useState("");
  const [EmailMap, setEmailMap] = React.useState("");
  const [Timeframe, setTimeframe] = React.useState("");
  const [Selections, setSelections] = React.useState([]);
  const [FailuresData, setFailuresData] = React.useState([]);
  const [QuerySlug, setQuerySlug] = React.useState("");
  const [BulkAction, setBulkAction] = React.useState("");
  const [ScheduledPlansData, setScheduledPlansData] = React.useState([]);

  return (
    <Menu>
      <MenuDisclosure>
        <Button>Global Actions</Button>
      </MenuDisclosure>

      {/* GlobalReassignOwnership Dialog Start */}
      <Dialog
        isOpen={isToggledGRO}
        onClose={() => {
          ToggleGRO();
          setUserMapFrom([]);
          setUserMapTo("");
        }}
      >
        <DialogContent>
          <ConfirmLayout
            title="Reassign Schedule Ownership"
            message={
              <>
                <Paragraph mb="small">
                  This will reassign ownership of all schedule plans from the
                  selected users to the new selected user.
                </Paragraph>
                <Flex justifyContent="space-around" mt="small" mb="small">
                  <Box>
                    <Text fontSize="medium">From</Text>
                  </Box>
                  <Box>
                    <Text fontSize="medium">To</Text>
                  </Box>
                </Flex>
                <Space>
                  <SelectMulti
                    onChange={(e: any) => setUserMapFrom(e)}
                    options={users}
                    flex={1}
                  />
                  <Select
                    onChange={(e: any) => setUserMapTo(e)}
                    options={users}
                    flex={1}
                    placeholder=" "
                    isClearable
                  />
                </Space>
              </>
            }
            primaryButton={
              <Button
                disabled={UserMapFrom.length === 0 || UserMapTo === ""}
                onClick={() => {
                  GlobalReassignOwnership(UserMapFrom, UserMapTo);
                  ToggleGRO();
                  setUserMapFrom([]);
                  setUserMapTo("");
                  toggleLog();
                }}
              >
                Run
              </Button>
            }
            secondaryButton={
              <ButtonTransparent
                onClick={() => {
                  ToggleGRO();
                  setUserMapFrom([]);
                  setUserMapTo("");
                }}
              >
                Cancel
              </ButtonTransparent>
            }
          />
        </DialogContent>
      </Dialog>
      {/* GlobalReassignOwnership Dialog End */}

      {/* GlobalFindReplace Dialog Start */}
      <Dialog
        isOpen={isToggledGFR}
        onClose={() => {
          ToggleGFR();
          setEmailMap("");
        }}
      >
        <DialogContent>
          <ConfirmLayout
            title="Update Email Destinations from Mapping"
            message={
              <>
                <Paragraph mb="small">
                  Paste a CSV of email address mappings. There should be two
                  addresses per line, separated by a comma.
                </Paragraph>
                <Paragraph mb="small">
                  If a schedule plan destination has the email address in the
                  first column, the address will be updated to the value in the
                  second column. This will update all schedule plans across the
                  instance where there is a match.
                </Paragraph>
                <Paragraph mb="small">
                  Note that the schedule plans must be enabled to be updated.
                  Emails are not case sensitive.
                </Paragraph>
                <MonospaceTextArea
                  resize
                  onChange={(e: any) => setEmailMap(e.target.value)}
                  placeholder={
                    "jon.snow@old.com,jsnow@new.com         arya.stark@old.com,astark@new.com"
                  }
                />
              </>
            }
            primaryButton={
              <Button
                disabled={EmailMap === ""}
                onClick={() => {
                  GlobalFindReplaceEmail(EmailMap);
                  ToggleGFR();
                  setEmailMap("");
                  toggleLog();
                }}
              >
                Run
              </Button>
            }
            secondaryButton={
              <ButtonTransparent
                onClick={() => {
                  ToggleGFR();
                  setEmailMap("");
                }}
              >
                Cancel
              </ButtonTransparent>
            }
          />
        </DialogContent>
      </Dialog>
      {/* GlobalFindReplace Dialog End */}

      {/* Validate Recent Schedule Jobs Dialog Start (STEP 1) */}
      <Dialog
        isOpen={isToggledVRS}
        onClose={() => {
          ToggleVRS();
          setTimeframe("");
        }}
      >
        <DialogContent>
          <ConfirmLayout
            title="Validate Recent Schedule Jobs"
            message={
              <>
                <Paragraph mb="small">
                  Use this feature to resend any schedules that have failed on
                  their most recent attempt, within the timeframe entered below.
                  This will first run a System Activity query to find any recent
                  failures. In the next step, you will have the option to filter
                  the results and resend the selected schedule plans.
                </Paragraph>
                <Paragraph mb="small">
                  The timeframe will be used to filter the
                  <strong> scheduled_job.finalized_time</strong> column. Any
                  Looker datetime filter expression is valid.
                </Paragraph>
                <InputText
                  onChange={(e: any) => setTimeframe(e.target.value)}
                  placeholder="24 hours"
                />
              </>
            }
            primaryButton={
              <Button
                disabled={Timeframe === ""}
                onClick={async () => {
                  setRunningQuery(true);
                  ToggleVRS();
                  ToggleRRF();
                  await GlobalValidateRecentSchedules(Timeframe).then(
                    (results: any) => {
                      setFailuresData(results);
                      setRunningQuery(false);
                      setTimeframe("");
                    }
                  );
                }}
              >
                Run
              </Button>
            }
            secondaryButton={
              <ButtonTransparent
                onClick={() => {
                  ToggleVRS();
                  setTimeframe("");
                }}
              >
                Cancel
              </ButtonTransparent>
            }
          />
        </DialogContent>
      </Dialog>
      {/* Validate Recent Schedule Jobs Dialog End (STEP 1) */}

      {/* Validate Recent Schedule Jobs Dialog Start (STEP 2) */}
      <Dialog
        isOpen={isToggledRRF}
        onClose={() => {
          ToggleRRF();
          setFailuresData([]);
          setSelections([]);
        }}
        maxWidth="90%"
      >
        <DialogContent>
          <ConfirmLayout
            title="Resend Schedule Job Failures"
            message={
              <>
                {runningQuery ? (
                  <>
                    <Paragraph mb="small">
                      Gathering all recently failed scheduled jobs (this may
                      take some time to run):
                    </Paragraph>
                    <Flex justifyContent="center">
                      <FlexItem alignSelf="center">
                        <Spinner color="black" />
                      </FlexItem>
                    </Flex>
                  </>
                ) : (
                  ActionListDataTable(
                    FailuresData,
                    Selections,
                    setSelections,
                    ACTION_LIST_FAIL_COLUMNS,
                    "Failures"
                  )
                )}
              </>
            }
            primaryButton={
              <Button
                disabled={Selections.length === 0}
                onClick={() => {
                  GlobalResendRecentFailures(Selections);
                  ToggleRRF();
                  setFailuresData([]);
                  setSelections([]);
                  toggleLog();
                }}
              >
                Resend
              </Button>
            }
            secondaryButton={
              <ButtonTransparent
                onClick={() => {
                  ToggleRRF();
                  setFailuresData([]);
                  setSelections([]);
                }}
              >
                Cancel
              </ButtonTransparent>
            }
          />
        </DialogContent>
      </Dialog>
      {/* Validate Recent Schedule Jobs Dialog End (STEP 2) */}

      {/* Select By Query ID Dialog Start (STEP 1) */}
      <Dialog
        isOpen={isToggledSBQ}
        onClose={() => {
          ToggleSBQ();
          setQuerySlug("");
        }}
      >
        <DialogContent>
          <ConfirmLayout
            title="Select Schedule Plans By Query ID"
            message={
              <>
                <Paragraph mb="small">
                  Enter a query slug (qid) from the URL of a{" "}
                  <Link onClick={() => openExploreWindow()}>
                    Scheduled Plan
                  </Link>
                  &nbsp;System Activity explore. The query must have a
                  "scheduled_plan.id" column which will be used to select
                  scheduled plans.
                </Paragraph>

                <Paragraph mb="small">
                  In the next step, you will have the option to further filter
                  the results and choose one of the following functions to run
                  of the selections:
                </Paragraph>

                <List type="bullet">
                  <ListItem>Enable</ListItem>
                  <ListItem>Disable</ListItem>
                  <ListItem>Delete</ListItem>
                  <ListItem>Run Once</ListItem>
                </List>

                <InputText
                  onChange={(e: any) => setQuerySlug(e.target.value)}
                />
              </>
            }
            primaryButton={
              <Button
                disabled={QuerySlug === ""}
                onClick={async () => {
                  setRunningQuery(true);
                  ToggleSBQ();
                  ToggleSBQR();
                  await GlobalSelectByQuery(QuerySlug).then((results: any) => {
                    setScheduledPlansData(results);
                    setRunningQuery(false);
                    setQuerySlug("");
                  });
                }}
              >
                Run
              </Button>
            }
            secondaryButton={
              <ButtonTransparent
                onClick={() => {
                  ToggleSBQ();
                  setQuerySlug("");
                }}
              >
                Cancel
              </ButtonTransparent>
            }
          />
        </DialogContent>
      </Dialog>
      {/* Select By Query ID Dialog End (STEP 1) */}

      {/* Select By Query ID Dialog Start (STEP 2) */}
      <Dialog
        isOpen={isToggledSBQR}
        onClose={() => {
          ToggleSBQR();
          setScheduledPlansData([]);
          setSelections([]);
          setBulkAction("");
        }}
        maxWidth="90%"
      >
        <DialogContent>
          <ConfirmLayout
            title="Select Schedule Plans By Query ID"
            message={
              <>
                {runningQuery ? (
                  <>
                    <Paragraph mb="small">
                      Gathering scheduled plans (this may take some time to
                      run):
                    </Paragraph>
                    <Flex justifyContent="center">
                      <FlexItem alignSelf="center">
                        <Spinner color="black" />
                      </FlexItem>
                    </Flex>
                  </>
                ) : (
                  [
                    ActionListDataTable(
                      ScheduledPlansData,
                      Selections,
                      setSelections,
                      ACTION_LIST_SELECT_BY_QUERY_COLUMNS,
                      "SelectByQuery"
                    ),
                    <Box key="box" m="small" />,
                    <RadioGroup
                      key="radio_group"
                      inline
                      value={BulkAction}
                      onChange={setBulkAction}
                      options={[
                        {
                          value: "enable",
                          label: "Enable",
                        },
                        {
                          value: "disable",
                          label: "Disable",
                        },
                        {
                          value: "delete",
                          label: "Delete",
                        },
                        {
                          value: "run once",
                          label: "Run Once",
                        },
                      ]}
                    />,
                  ]
                )}
              </>
            }
            primaryButton={
              <Button
                disabled={Selections.length === 0 || BulkAction === ""}
                onClick={() => {
                  GlobalSelectByQueryRun(Selections, BulkAction);
                  ToggleSBQR();
                  setScheduledPlansData([]);
                  setSelections([]);
                  setBulkAction("");
                  toggleLog();
                }}
              >
                Execute
              </Button>
            }
            secondaryButton={
              <ButtonTransparent
                onClick={() => {
                  ToggleSBQR();
                  setScheduledPlansData([]);
                  setSelections([]);
                  setBulkAction("");
                }}
              >
                Cancel
              </ButtonTransparent>
            }
          />
        </DialogContent>
      </Dialog>
      {/* Select By Query ID Dialog End (STEP 2) */}

      <MenuList>
        <MenuItem icon="Beaker" onClick={ToggleGFR}>
          Find & Replace Emails
        </MenuItem>
        <MenuItem icon="Beaker" onClick={ToggleGRO}>
          Reassign Ownership
        </MenuItem>
        <MenuItem icon="Beaker" onClick={ToggleVRS}>
          Resend Failed Schedules
        </MenuItem>
        <MenuItem icon="Beaker" onClick={ToggleSBQ}>
          Select By Query
        </MenuItem>
      </MenuList>
    </Menu>
  );
};
