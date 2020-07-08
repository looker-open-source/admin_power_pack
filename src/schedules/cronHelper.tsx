import cronstrue from "cronstrue";

export const translateCron = (cron: string): string => {
  // console.log(cron);

  if (cron !== "") {
    try {
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

// only validate if cronstring has >=4 spaces
export const validationTypeCron = (cron: string): "error" | undefined => {
  const cronExpression = translateCron(cron);

  //   const spaceCount = cron.split(" ").length - 1;
  if (cron !== "" && cronExpression === "Not a valid cron expression") {
    return "error";
  }
  return undefined;
};
