import * as v from 'valibot';
import { ClaimsQuery } from '../claims-query/m-claims-query.js';
import { DcqlUndefinedClaimSetIdError } from '../e-dcql.js';
import { idRegex, vNonEmptyArray } from '../u-query.js';

/**
 * A Credential Query is an object representing a request for a presentation of one Credential.
 */
export namespace CredentialQuery {
  const vBase = v.object({
    id: v.pipe(
      v.string(),
      v.regex(idRegex),
      v.description(
        `REQUIRED. A string identifying the Credential in the response and, if provided, the constraints in 'credential_sets'.`
      )
    ),
    claim_sets: v.optional(
      v.pipe(
        v.array(v.array(v.pipe(v.string(), v.regex(idRegex)))),
        vNonEmptyArray(),
        v.description(
          `OPTIONAL. A non-empty array containing arrays of identifiers for elements in 'claims' that specifies which combinations of 'claims' for the Credential are requested.`
        )
      )
    ),
  });

  export const vMdoc = v.object({
    ...vBase.entries,
    format: v.pipe(
      v.literal('mso_mdoc'),
      v.description(
        `REQUIRED. A string that specifies the format of the requested Verifiable Credential.`
      )
    ),
    claims: v.pipe(
      v.optional(v.pipe(v.array(ClaimsQuery.vMdoc), vNonEmptyArray())),
      v.description(
        `OPTIONAL. A non-empty array of objects as that specifies claims in the requested Credential.`
      )
    ),
    meta: v.pipe(
      v.optional(
        v.object({
          doctype_value: v.pipe(
            v.optional(v.string()),
            v.description(
              `OPTIONAL. String that specifies an allowed value for the doctype of the requested Verifiable Credential.`
            )
          ),
        })
      ),
      v.description(
        `OPTIONAL. An object defining additional properties requested by the Verifier that apply to the metadata and validity data of the Credential.`
      )
    ),
  });
  export type Mdoc = v.InferOutput<typeof vMdoc>;

  export const vSdJwtVc = v.object({
    ...vBase.entries,
    format: v.pipe(
      v.literal('vc+sd-jwt'),
      v.description(
        `REQUIRED. A string that specifies the format of the requested Verifiable Credential.`
      )
    ),
    claims: v.pipe(
      v.optional(v.pipe(v.array(ClaimsQuery.vW3cSdJwtVc), vNonEmptyArray())),
      v.description(
        `OPTIONAL. A non-empty array of objects as that specifies claims in the requested Credential.`
      )
    ),
    meta: v.pipe(
      v.optional(
        v.pipe(
          v.object({
            vct_values: v.optional(v.array(v.string())),
          }),
          v.description(
            `OPTIONAL. An array of strings that specifies allowed values for the type of the requested Verifiable Credential.`
          )
        )
      ),
      v.description(
        `OPTIONAL. An object defining additional properties requested by the Verifier that apply to the metadata and validity data of the Credential.`
      )
    ),
  });
  export type SdJwtVc = v.InferOutput<typeof vSdJwtVc>;

  export const vW3c = v.object({
    ...vBase.entries,
    format: v.picklist(['jwt_vc_json', 'jwt_vc_json-ld']),
    claims: v.optional(
      v.pipe(v.array(ClaimsQuery.vW3cSdJwtVc), vNonEmptyArray())
    ),
  });
  export type W3c = v.InferOutput<typeof vW3c>;

  export const vModel = v.variant('format', [vMdoc, vSdJwtVc, vW3c]);
  export type Input = v.InferInput<typeof vModel>;
  export type Output = v.InferOutput<typeof vModel>;

  export const validate = (credentialQuery: Output) => {
    claimSetIdsAreDefined(credentialQuery);
  };
}
export type CredentialQuery = CredentialQuery.Output;

// --- validations --- //

const claimSetIdsAreDefined = (credentialQuery: CredentialQuery) => {
  if (!credentialQuery.claim_sets) return;
  const claimIds = new Set(credentialQuery.claims?.map(claim => claim.id));

  const undefinedClaims: string[] = [];
  for (const claim_set of credentialQuery.claim_sets) {
    for (const claim_id of claim_set) {
      if (!claimIds.has(claim_id)) {
        undefinedClaims.push(claim_id);
      }
    }
  }

  if (undefinedClaims.length > 0) {
    throw new DcqlUndefinedClaimSetIdError({
      message: `Credential set contains undefined credential id${undefinedClaims.length === 0 ? '' : '`s'} '${undefinedClaims.join(', ')}'`,
    });
  }
};
