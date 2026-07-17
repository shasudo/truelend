# Product card photography — provenance and licence

All nine files here are Unsplash photos under the [Unsplash
Licence](https://unsplash.com/license): free to use commercially, no permission
or attribution required. Attribution is recorded anyway so the provenance of
public marketing imagery is auditable, and so a replacement can be sourced
without re-running the search.

Retrieved 2026-07-17. Each was downloaded at 1200px wide, then resized to 900px
wide / quality 78 for the card grid.

| File                        | Photo ID      | Photographer                      | Subject                |
| --------------------------- | ------------- | --------------------------------- | ---------------------- |
| `home-loan.jpg`             | `EMPLSuvDuhQ` | Naomi Ellsworth                   | Modern house exterior  |
| `loan-against-property.jpg` | `RV6bmOOBV_g` | Paramdeo Singh                    | Glass office tower     |
| `business-loan.jpg`         | `pYlBAu3de0w` | Musemind UX Agency                | Open-plan office       |
| `personal-loan.jpg`         | `vIbxvHj9m9g` | Prydumano Design                  | Minimal living room    |
| `vehicle-loan.jpg`          | `AmFj7Xn9x_k` | Portafolio fotográfico automotriz | Cars in a showroom     |
| `education-loan.jpg`        | `_UEwOH4hu0s` | Moonlight Endearer                | Modern campus building |
| `working-capital.jpg`       | `-aCrA9FmT8Y` | Alberto Rodríguez                 | Warehouse interior     |
| `equipment-finance.jpg`     | `ZgmGq_eFmUs` | Jamar Penny                       | Excavator on a site    |
| `credit-cards.jpg`          | `0hs_mYB9KRc` | CardMapr.nl                       | EMV chip close-up      |

Fetch any original with `https://unsplash.com/photos/<id>`.

## Known limitations

These are stock, not commissioned to an art brief, and none of them depict India
— the closest India-specific results on Unsplash were rural-poverty imagery that
would be badly off-brand for a lender. `category-card.tsx` holds saturation at
0.45 and multiplies a navy tint over the top to make the mixed set read as one
system; that treatment is load-bearing. Untreated, the green chip macro and the
red car fight every other tile in the grid.

Subjects were chosen to be mid-distance and architectural wherever possible.
That is deliberate: it keeps the set uniform, and it avoids stock photos of
Western faces standing in for Indian borrowers.

`equipment-finance.jpg` has a legible "CAT" marking on the excavator. Editorial
use of an incidental third-party mark is normally fine, but it is the one file
here with a trademark in frame.

Replacing these with photography shot to a single brief — ideally Indian
locations — is the real fix. Avoid Unsplash+ ("plus"/"premium") results: they
need a paid subscription and are not covered by the licence above.
