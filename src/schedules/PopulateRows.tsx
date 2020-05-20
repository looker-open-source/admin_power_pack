import React from "react";
import {
  Box,
  Button,
  ButtonOutline,
  ButtonTransparent,
  DrawerManager,
  Fieldset,
  FieldText,
  ModalContent,
  ModalContext,
  ModalFooter,
  ModalHeader,
  Text,
} from "@looker/components";

export interface PopulateParams {
  queryId?: number;
  ownerId?: number;
  scheduleName?: string;
  cron?: string;
}

export interface PopulateRowProps {
  popParams: PopulateParams;
  resetPopParams(): void;
  validPopParams(): boolean;
  handlePopQueryId(e: any): void;
  handlePopOwnerId(e: any): void;
  handlePopName(e: any): void;
  handlePopCron(e: any): void;
  handlePopSubmit(): void;
}

// drawer to populate rows with results of query
// https://components.looker.com/components/modals/drawer/
export const PopulateRows = (prp: PopulateRowProps): JSX.Element => {
  const {
    popParams,
    resetPopParams,
    validPopParams,
    handlePopQueryId,
    handlePopOwnerId,
    handlePopName,
    handlePopCron,
    handlePopSubmit,
  } = prp;
  return (
    <DrawerManager
      width={"small"}
      content={
        <>
          <ModalHeader>Populate Rows</ModalHeader>
          <ModalContent>
            <Fieldset>
              <FieldText
                required={true}
                label="Query ID"
                type="number"
                min="1"
                value={String(popParams.queryId)}
                onChange={(e: any) => {
                  handlePopQueryId(e);
                }}
              />
              <FieldText
                label="Owner ID"
                type="number"
                min="1"
                value={String(popParams.ownerId)}
                onChange={(e: any) => {
                  handlePopOwnerId(e);
                }}
              />
              <FieldText
                label="Name of Schedule"
                type="text"
                value={popParams.scheduleName}
                onChange={(e: any) => {
                  handlePopName(e);
                }}
              />
              <FieldText
                label="Crontab"
                type="text"
                value={popParams.cron}
                onChange={(e: any) => {
                  handlePopCron(e);
                }}
              />
            </Fieldset>
            <Box
              display="inline-block"
              height="300px"
              bg="palette.purple100"
              ml="small"
              p="small"
              width="190px"
              fontSize="small"
              borderRadius="4px"
            >
              <Text fontSize="small">
                This will generate a new schedule plan for each row in the
                results of a Looker query. Filter values will be populated if
                the field label matches the filter name on the Dashboard. Ensure
                there is a field
              </Text>{" "}
              <Text fontWeight="semiBold">"Email"</Text>{" "}
              <Text fontSize="small"> to populate Recipients.</Text>
            </Box>
          </ModalContent>
          <ModalContext.Consumer>
            {({ closeModal }) => (
              <ModalFooter>
                <Button
                  disabled={!validPopParams()}
                  onClick={() => {
                    console.log("submitting populate row parameters");
                    handlePopSubmit();
                    if (closeModal !== undefined) {
                      closeModal();
                    }
                  }}
                >
                  Submit
                </Button>
                <ButtonTransparent
                  onClick={() => {
                    resetPopParams();
                    if (closeModal !== undefined) {
                      closeModal();
                    }
                  }}
                >
                  Cancel
                </ButtonTransparent>
              </ModalFooter>
            )}
          </ModalContext.Consumer>
        </>
      }
    >
      {(onClick) => (
        <ButtonOutline onClick={onClick}>Populate Rows</ButtonOutline>
      )}
    </DrawerManager>
  );
};
