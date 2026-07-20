# External Integration Governance

This application distinguishes reference nutrition data, user-entered label data,
and clinical information. A new provider must not be presented as clinician-reviewed
solely because it has an API.

## Verified Research, 2026-07-20

### USDA FoodData Central

- Official API guide: https://fdc.nal.usda.gov/api-guide.html
- The guide states that anyone may access and use the API, but every request needs a
  data.gov API key.
- API keys are account credentials. They must never be embedded in this browser-only
  client, committed to source control, or placed in a public Vite environment variable.
- Production integration requires a server-side proxy, rate limiting, request logging,
  cache expiry, and source/reference retention per selected food.

### Open Food Facts

- Data and license page: https://world.openfoodfacts.org/data
- The database is available under the Open Database License (ODbL).
- Its product data is community contributed. It can be useful for barcode and package
  label lookup, but must retain attribution and be displayed as label/community data,
  not as a clinical or laboratory source.
- A provider integration must retain the product barcode, retrieval date, source URL,
  declared nutrition values, and confidence label. It must also handle missing or
  incomplete minerals rather than silently treating them as zero.

### China CDC National Institute for Nutrition and Health

- Official site: https://www.chinanutri.cn/
- The site is copyright protected. Research access confirmed the public site and food
  composition monitoring activity, but did not identify a public data API or an
  application redistribution license for Chinese food composition tables.
- Do not scrape, copy, or redistribute the table. A Chinese food composition provider
  can only be integrated after a written license or an official redistribution/API
  agreement is recorded in this repository.

## Clinical Safety Gate

The application may store an existing clinician plan and compare recorded food totals
against values entered from that plan. It must not generate a diagnosis, treatment
target, medication recommendation, dialysis instruction, or emergency triage result.

Before any disease-specific mode is released, all of the following are required:

1. Named guideline version and evidence owner for every rule.
2. Independent review by appropriately licensed clinicians and dietitians.
3. Case-based validation, adverse-case review, and documented exclusions.
4. User-facing source, review date, uncertainty, and escalation wording.
5. Regulatory/privacy assessment for every release jurisdiction.

## Privacy and Sync Gate

The current application stores data locally and supports user-controlled encrypted
backup export. A cloud-sync feature is not present.

Cloud sync requires an authenticated backend, explicit consent, encryption in transit
and at rest, key management, account recovery, deletion/export requests, retention
limits, audit logs, rate limiting, conflict handling, and an incident response plan.
Do not represent browser localStorage as a secure clinical record.

## Provider Admission Checklist

Every future provider must document:

1. Provider, owner, source URL, license, and attribution text.
2. Retrieval method, credential storage location, rate limit, and cache lifetime.
3. Nutrient mapping, units, serving basis, and missing-value behavior.
4. Confidence label: reference, label, estimate, or user.
5. Validation samples and rollback/removal procedure.
