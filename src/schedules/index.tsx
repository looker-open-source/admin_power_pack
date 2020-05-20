import * as React from "react";
import * as ReactDOM from "react-dom";
import { Extension } from "./Extension";
import { ExtensionProvider } from "@looker/extension-sdk-react";
import { GlobalStyle, theme, Spinner, Flex } from "@looker/components";
import { ThemeProvider } from "styled-components";

window.addEventListener("DOMContentLoaded", async (event) => {
  const root = document.createElement("div");
  document.body.appendChild(root);

  const loading = (
    <Flex width="100%" height="90%" alignItems="center" justifyContent="center">
      <Spinner color="black" />
    </Flex>
  );

  ReactDOM.render(
    // ExtensionProvider provides subcomponents access to the Looker Extension SDK
    <ExtensionProvider
      loadingComponent={loading}
      requiredLookerVersion=">=6.24.0"
    >
      <ThemeProvider theme={theme}>
        <>
          <GlobalStyle />
          <Extension />
        </>
      </ThemeProvider>
    </ExtensionProvider>,
    root
  );
});
