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
import styled from "styled-components";
import {
  ActionList,
  ActionListItem,
  ActionListItemColumn,
  Button,
  ButtonTransparent,
  ConfirmLayout,
  Dialog,
  DialogContent,
  Flex,
  FlexItem,
  InputText,
  Menu,
  MenuDisclosure,
  MenuItem,
  MenuList,
  Paragraph,
  Spinner,
  TextArea,
} from "@looker/components";
import { fail } from "assert";

export interface QueryProps {
  GlobalFindReplaceEmail(EmailMap: string): void;
  GlobalValidateRecentSchedules(timeframe: string): any;
  GlobalResendRecentFailures(failureData: any): void;
}

const MonospaceTextArea = styled(TextArea)`
  textarea {
    font-family: monospace;
  }
`;

const ActionListFailureResults = (data: any): JSX.Element => {
  const columns = [
    {
      id: "scheduled_plan.id",
      // type: 'number',
      title: "Plan ID",
      widthPercent: 5,
    },
    {
      id: "scheduled_job.name",
      // type: 'string',
      title: "Name",
      widthPercent: 10,
    },
    {
      id: "scheduled_job.id",
      // type: 'number',
      primaryKey: true,
      title: "Job ID",
      widthPercent: 5,
    },
    {
      id: "scheduled_job.finalized_time",
      // type: 'string',
      title: "Finalized Time",
      widthPercent: 12,
    },
    {
      id: "user.name",
      // type: 'string',
      title: "Owner",
      widthPercent: 10,
    },
    {
      id: "scheduled_job.status_detail",
      // type: 'string',
      title: "Status Detail",
      widthPercent: 30,
    },
    {
      id: "scheduled_plan.content_type_id",
      // type: 'string',
      title: "Content Type ID",
      widthPercent: 10,
    },
    {
      id: "scheduled_plan.destination_addresses",
      // type: "string",
      title: "Destination Addresses",
      widthPercent: 18,
    },
  ];

  const items = data.map((row: any) => {
    return (
      <ActionListItem
        key={row["scheduled_job.id"]}
        id={row["scheduled_job.id"]}
      >
        <ActionListItemColumn>{row["scheduled_plan.id"]}</ActionListItemColumn>
        <ActionListItemColumn>{row["scheduled_job.name"]}</ActionListItemColumn>
        <ActionListItemColumn>{row["scheduled_job.id"]}</ActionListItemColumn>
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

  return <ActionList columns={columns}>{items}</ActionList>;
};

export const GlobalActions = (qp: QueryProps): JSX.Element => {
  const {
    GlobalFindReplaceEmail,
    GlobalValidateRecentSchedules,
    GlobalResendRecentFailures,
  } = qp;

  const [isToggledGFR, setisToggledGFR] = React.useState(false);
  const [isToggledVRS, setisToggledVRS] = React.useState(false);
  const [isToggledRRF, setisToggledRRF] = React.useState(false);
  const [runningQuery, setRunningQuery] = React.useState(false);

  const ToggleGFR = () => setisToggledGFR((on) => !on);
  const ToggleVRS = () => setisToggledVRS((on) => !on);
  const ToggleRRF = () => setisToggledRRF((on) => !on);

  const [EmailMap, setEmailMap] = React.useState("");
  const [Timeframe, setTimeframe] = React.useState("");
  const [FailuresData, setFailuresData] = React.useState([]);

  return (
    <Menu>
      <MenuDisclosure>
        <Button>Global Actions</Button>
      </MenuDisclosure>

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
                  Use this feature to resend any failed schedules that have
                  failed within the timeframe entered below. This will first run
                  a System Activity query to find any recent failures. In the
                  next step, you will have the option resend.
                </Paragraph>
                <Paragraph mb="small">
                  The timeframe will be used to filter the
                  `scheduled_job.finalized_time` column. Any Looker datetime
                  filter expression is valid.
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
                      Gathering all recently failed scheduled job (this may take
                      some time to run):
                    </Paragraph>
                    <Flex justifyContent="center">
                      <FlexItem alignSelf="center">
                        <Spinner color="black" />
                      </FlexItem>
                    </Flex>
                  </>
                ) : (
                  ActionListFailureResults(FailuresData)
                )}
              </>
            }
            primaryButton={
              <Button
                disabled={FailuresData.length === 0}
                onClick={() => {
                  GlobalResendRecentFailures(FailuresData);
                  ToggleRRF();
                  setFailuresData([]);
                }}
              >
                Resend All
              </Button>
            }
            secondaryButton={
              <ButtonTransparent
                onClick={() => {
                  ToggleRRF();
                  setFailuresData([]);
                }}
              >
                Cancel
              </ButtonTransparent>
            }
          />
        </DialogContent>
      </Dialog>
      {/* Validate Recent Schedule Jobs Dialog End (STEP 2) */}

      <MenuList>
        <MenuItem icon="Beaker" onClick={ToggleGFR}>
          Find & Replace Emails
        </MenuItem>
        <MenuItem icon="Beaker" onClick={ToggleVRS}>
          Resend Failed Schedules
        </MenuItem>
      </MenuList>
    </Menu>
  );
};
