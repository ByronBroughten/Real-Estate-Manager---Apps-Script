import { TopOperator } from "./TopOperator.js";

function test(doTest: boolean = true) {
  if (doTest) {
    const top = TopOperator.init();
    top.test();
    console.log("All tests passed");
  }
}
test(false);
