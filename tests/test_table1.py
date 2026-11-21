"""Scientific counting invariants for the reproducible manuscript table."""
import csv
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("build_table1", ROOT / "scripts/build_table1.py")
table = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(table)


def definition():
    return {
        "version": "test", "date": "2026-11-21", "title": "Test",
        "blocks": [{"id": x, "label": x, "short": x} for x in ["deterministic", "probabilistic", "vae"]],
        "bands": [{"id": "low", "minimum": 0, "maximum_exclusive": 25, "color": "#eee"},
                  {"id": "middle-low", "minimum": 25, "maximum_exclusive": 50, "color": "#ddd"},
                  {"id": "middle-high", "minimum": 50, "maximum_exclusive": 75, "color": "#ccc"},
                  {"id": "high", "minimum": 75, "maximum_inclusive": 100, "color": "#bbb"}],
        "rows": [{"id": "paired", "group": "Correspondence", "label": "Paired", "field": "axis_correspondence", "values": ["paired"], "definition": "Paired observations"},
                 {"id": "posterior", "group": "Uncertainty", "label": "Posterior", "field": "posterior", "values": [], "definition": "Posterior distribution"}],
        "rules": {"counting": "Exclude unknowns"},
    }


def fixture():
    records = [
        {"method_id": "a", "method": "A", "methodological_components": "deterministic;probabilistic;vae", "axis_correspondence": "paired;unpaired"},
        {"method_id": "b", "method": "B", "methodological_components": "deterministic", "axis_correspondence": "unpaired"},
        {"method_id": "c", "method": "C", "methodological_components": "deterministic", "axis_correspondence": "not-assessed"},
        {"method_id": "outside", "method": "Excluded", "methodological_components": "deterministic", "axis_correspondence": "paired"},
    ]
    population = {"method_ids": ["a", "b", "c"], "source_atlas_commit": "frozen"}
    evidence = {"profiles": [
        {"method_id": "a", "posterior": {"status": "yes", "rationale": "Returns a posterior"}},
        {"method_id": "b", "posterior": {"status": "no", "rationale": "Scoped point output"}},
        {"method_id": "c", "posterior": {"status": "not-assessed", "rationale": "Source incomplete"}},
    ]}
    return records, definition(), population, evidence


class TableCountingTests(unittest.TestCase):
    def test_exact_band_boundaries_and_unrounded_fraction(self):
        bands = definition()["bands"]
        for n, den, expected in [(0, 4, "low"), (1, 4, "middle-low"), (2, 4, "middle-high"),
                                  (3, 4, "high"), (4, 4, "high"), (249, 1000, "low"),
                                  (499, 1000, "middle-low"), (749, 1000, "middle-high")]:
            with self.subTest(n=n, denominator=den):
                self.assertEqual(table.frequency_band(n, den, bands), expected)
        self.assertIsNone(table.frequency_band(0, 0, bands))

    def test_unknown_excluded_scoped_negative_included(self):
        result = table.aggregate(*fixture())
        cell = result["rows"][0]["cells"]["deterministic"]
        self.assertEqual((cell["n"], cell["N"], cell["unknown"]), (1, 2, 1))
        self.assertEqual(cell["members"], ["a"])
        self.assertEqual(cell["negative_members"], ["b"])
        self.assertEqual(cell["excluded_unknown"], ["c"])
        self.assertEqual(cell["pct"], 50)

    def test_hybrid_counted_once_in_each_block_and_outside_excluded(self):
        result = table.aggregate(*fixture())
        self.assertEqual(result["totals"], {"unique_methods": 3, "column_memberships": 5, "unassessed_column_memberships": 0})
        self.assertEqual([b["total"] for b in result["blocks"]], [3, 1, 1])
        for block in result["blocks"]:
            self.assertEqual(block["members"].count("a"), 1)
            self.assertNotIn("outside", block["members"])

    def test_missing_and_blank_evidence_is_unknown(self):
        args = list(fixture())
        args[3] = {"profiles": []}
        result = table.aggregate(*args)
        cell = result["rows"][1]["cells"]["deterministic"]
        self.assertEqual((cell["n"], cell["N"], cell["unknown"]), (0, 0, 3))
        self.assertIsNone(cell["pct"])
        self.assertIsNone(cell["band"])
        args[0][0]["axis_correspondence"] = ""
        self.assertEqual(table.aggregate(*args)["rows"][0]["cells"]["deterministic"]["N"], 1)

    def test_uncertain_column_membership_excluded_separately(self):
        args = list(fixture())
        args[3]["profiles"][1]["component_membership_uncertain"] = {
            "probabilistic": {"status": "not-assessed", "rationale": "Unresolved component use", "sources": ["https://example.org/evidence"]}}
        result = table.aggregate(*args)
        block = next(b for b in result["blocks"] if b["id"] == "probabilistic")
        self.assertEqual(block["total"], 1)
        self.assertEqual(block["membership_unknown"], 1)
        self.assertEqual(block["excluded_membership_unknown"], ["b"])
        for row in result["rows"]:
            cell = row["cells"]["probabilistic"]
            self.assertEqual((cell["n"], cell["N"], cell["unknown"]), (1, 1, 0))
            self.assertNotIn("b", cell["excluded_unknown"])
        self.assertIn("b", result["rows"][0]["cells"]["deterministic"]["negative_members"])
        self.assertEqual(result["totals"]["unassessed_column_memberships"], 1)
        page = table.make_html(result)
        self.assertIn("1 membership not assessed", page)
        self.assertIn('id="membership-probabilistic"', page)
        self.assertIn("Unresolved component use", page)

    def test_positive_and_uncertain_column_membership_cannot_coexist(self):
        args = list(fixture())
        args[3]["profiles"][0]["component_membership_uncertain"] = {
            "probabilistic": {"status": "not-assessed", "rationale": "Contradictory evidence"}}
        with self.assertRaisesRegex(ValueError, "cannot be positive and unknown"):
            table.aggregate(*args)

    def test_mixed_unknown_categorical_values_fail(self):
        args = list(fixture())
        args[0][0]["axis_correspondence"] = "paired;not-assessed"
        with self.assertRaisesRegex(ValueError, "Mixed known and unknown"):
            table.aggregate(*args)

    def test_invalid_uncertainty_status_fails(self):
        args = list(fixture())
        args[3]["profiles"][0]["posterior"]["status"] = "probably"
        with self.assertRaisesRegex(ValueError, "Invalid posterior"):
            table.aggregate(*args)

    def test_duplicate_or_missing_frozen_method_fails(self):
        for ids in [["a", "a"], ["not-in-atlas"]]:
            args = list(fixture())
            args[2]["method_ids"] = ids
            with self.assertRaises(ValueError):
                table.aggregate(*args)

    def test_missing_nested_probabilistic_membership_fails(self):
        args = list(fixture())
        args[0][0]["methodological_components"] = "vae"
        with self.assertRaisesRegex(ValueError, "VAE must also"):
            table.aggregate(*args)

    def test_csv_and_html_preserve_unknown_and_escape_content(self):
        args = list(fixture())
        args[0][0]["method"] = "A </script><script>unsafe</script>"
        result = table.aggregate(*args)
        rows = list(csv.DictReader(io.StringIO(table.make_csv(result))))
        self.assertEqual(rows[0]["excluded_unknown"], "c")
        self.assertEqual(rows[0]["N"], "2")
        page = table.make_html(result)
        self.assertNotIn("</script><script>unsafe", page)
        self.assertIn("A <\\/script>", page)
        self.assertIn("data/table1-counts.csv", page)

    def test_semicolon_sources_are_separate_and_column_definitions_visible(self):
        self.assertEqual(table.collect_urls({"sources": "https://example.org/a;https://example.org/b"}),
                         ["https://example.org/a", "https://example.org/b"])
        args = list(fixture())
        args[1]["blocks"][0]["definition"] = "A substantive point-estimate construction."
        page = table.make_html(table.aggregate(*args))
        self.assertIn("Building-block definitions for every column", page)
        self.assertIn("A substantive point-estimate construction.", page)

    def test_check_mode_detects_stale_output_and_never_writes(self):
        records, config, population, evidence = fixture()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "data").mkdir()
            stream = io.StringIO(newline="")
            writer = csv.DictWriter(stream, fieldnames=list(records[0]), lineterminator="\n")
            writer.writeheader()
            writer.writerows(records)
            (root / "data/integration_methods_library.csv").write_text(stream.getvalue())
            for name, value in [("definition", config), ("population", population), ("evidence", evidence)]:
                (root / f"data/table1-{name}.json").write_text(json.dumps(value))
            self.assertEqual(table.main(["--root", str(root)]), 0)
            self.assertEqual(table.main(["--root", str(root), "--check"]), 0)
            result = json.loads((root / "data/table1-counts.json").read_text())
            self.assertEqual(len(result["input_hashes"]), 4)
            self.assertTrue(all(len(value) == 64 for value in result["input_hashes"].values()))
            path = root / "table1.html"
            path.write_text("stale")
            self.assertEqual(table.main(["--root", str(root), "--check"]), 1)
            self.assertEqual(path.read_text(), "stale")


if __name__ == "__main__":
    unittest.main()
