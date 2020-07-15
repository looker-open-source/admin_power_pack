import cronstrue from "cronstrue";

export const translateCron = (cron: string): string => {
  // console.log(cron);

  if (cron !== "") {
    try {
      // valid cron must have 4 spaces
      const spaceCount = cron.split(" ").length - 1;
      if (spaceCount > 4) {
        return "Not a valid cron expression";
      }

      const expression = cronstrue.toString(cron);
      return expression;
    } catch (error) {
      return "Not a valid cron expression";
    }
  } else {
    return "";
  }
};

// used for validationMessage.type to show in error formatting
export const validationTypeCron = (cron: string): "error" | undefined => {
  const cronExpression = translateCron(cron);

  if (cron !== "" && cronExpression === "Not a valid cron expression") {
    return "error";
  }
  return undefined;
};
