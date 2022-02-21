async function checkProgress() {
  const elem = document.querySelector(".progress-parsingLogs");
  if (!elem) {
    setTimeout(checkProgress, 600);
    return;
  }
  const child = elem.querySelector(".progress-bar");
  const label = elem.querySelector(".progress-bar-label");
  try {
    const response = await fetch("/settings/progress");
    const json = await response.json();
    if (json.parsingLogs > 0) {
      elem.style.display = "flex";
      child.style.width = `${(json.parsedLogs / (json.parsingLogs || 1)) * 100}%`;
      child.style.maxWidth = `${(json.parsedLogs / (json.parsingLogs || 1)) * 100}%`;
      label.textContent = `<%= i18n.navSearchForLogs %> ${json.parsingLogs - json.parsedLogs} <%= i18n.navSearchForLogsLeft %>`;
    } else {
      elem.style.display = "none";
      child.style.width = "0";
      child.style.maxWidth = "0";
      label.textContent = "";
    }
  } catch (error) {
    console.warn(error);
  }
  setTimeout(checkProgress, 600);
}
checkProgress();
