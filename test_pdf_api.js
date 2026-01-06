// 测试PDF批量接口的简单脚本
// 这个脚本可以用于验证新添加的getAllBatchesPdfCounts接口是否正常工作

async function testPdfApi() {
  try {
    console.log("开始测试PDF批量接口...");

    // 测试新的批量获取所有批次PDF数量的接口
    const response = await fetch("/api/mysql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "getAllBatchesPdfCounts",
      }),
    });

    const result = await response.json();

    console.log("API测试结果:", result);

    if (result.success) {
      console.log("✅ 新接口测试成功");
      console.log("PDF数量统计:", result.data);
      console.log("获取的批次数量:", Object.keys(result.data).length);
    } else {
      console.log("❌ 新接口测试失败:", result.message);
    }
  } catch (error) {
    console.error("❌ 测试过程中发生错误:", error);
  }
}

// 如果直接运行这个脚本
if (typeof window === "undefined") {
  // Node.js 环境
  testPdfApi();
} else {
  // 浏览器环境，可以手动调用
  window.testPdfApi = testPdfApi;
  console.log("在浏览器控制台中运行: testPdfApi()");
}
