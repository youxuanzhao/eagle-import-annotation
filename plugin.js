const fs = require("fs");
const importButton = document.getElementById("importAnnotation");
let item = undefined;
importButton.addEventListener("click", importAnnotation);

function durationToSeconds(duration) {
  // duration: "hh:mm:ss"
  const parts = duration.split(":").map(Number);
  if (parts.length !== 3) return NaN;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

async function importAnnotation() {
  console.log(item.filePath);
  console.log(item.metadataFilePath);
  if (!item) {
    await eagle.notification.show({
      title: "未选择项目",
      body: "请先选择一个文件再导入场记。",
    });
    return;
  }

  let result = await eagle.dialog.showOpenDialog({
    defaultPath: item.filePath,
    properties: ["openFile"],
    filters: [{ name: "Text Files", extensions: ["txt"] }],
  });

  if (result.canceled || !result.filePaths.length) return;

  let annotationPath = result.filePaths[0];

  let data;
  try {
    data = fs.readFileSync(annotationPath);
  } catch (e) {
    console.log(e);
    await eagle.notification.show({
      title: "读取场记失败",
      body: "读取场记文件时出错。",
    });
    return;
  }

  let metadata = undefined;
  try {
    metadata = fs.readFileSync(item.metadataFilePath);
  } catch (e) {
    console.log(e);
    metadata = undefined;
  }

  if (metadata) {
    try {
      metadata = JSON.parse(metadata);
    } catch (e) {
      console.log(e);
      metadata = {};
    }
  } else {
    metadata = {};
  }

  if (!Array.isArray(metadata.comments)) {
    metadata.comments = [];
  }

  // Process each line in data, split by tab, convert duration, and push to metadata.comments
  const lines = data.toString().split("\n");
  for (const line of lines) {
    if (!line.trim()) continue; // skip empty lines
    let [duration, annotation] = line.split("\t");
    if (duration && annotation !== undefined) {
      const seconds = durationToSeconds(duration.trim());
      metadata.comments.push({
        duration: seconds,
        annotation: annotation.trim(),
      });
    }
  }

  try {
    fs.writeFileSync(item.metadataFilePath, JSON.stringify(metadata, null, 2));
    await eagle.notification.show({
      title: "场记导入成功",
      body: `已从${annotationPath}导入场记`,
    });
  } catch (e) {
    console.log(e);
    await eagle.notification.show({
      title: "保存元数据失败",
      body: "保存场记到元数据文件时出错。",
    });
  }
}

// Listen to plugin creation
eagle.onPluginCreate(async (plugin) => {
  // Get the current theme
  const theme = await eagle.app.theme;
  document.body.setAttribute("theme", theme);

  // Get the selected item
  let items = await eagle.item.getSelected();
  item = items[0];

  console.log(item);
  console.log(theme);
});

// Listen to theme changes
eagle.onThemeChanged((theme) => {
  document.body.setAttribute("theme", theme);
});
