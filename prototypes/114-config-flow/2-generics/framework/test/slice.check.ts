// PROTOTYPE #114, throwaway: a framework "test" against fixture configs.
import * as fixture from "../../../fixtureConfigs";
import { Api } from "../Api";

const api = new Api(fixture, { widget: (a) => a.sheet("widget").setValue(0, "run", false) }, {});
const widget = api.sheet("widget");
widget.setValue(0, "count", 3);
const n: number = widget.value(0, "count");
// @ts-expect-error: "count" is a number column
widget.setValue(0, "count", "three");
// @ts-expect-error: no real-estate sheet in the fixture set
api.sheet("unit");
widget.setValue(0, "run", true);
api.onEdit(11);
console.log("  framework fixture:", { header: widget.header("count"), count: n, run: widget.value(0, "run") });
