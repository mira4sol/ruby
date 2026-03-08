import { Policy, PolicyCreateParams } from '@privy-io/node/resources'
import { AppError } from '../types/errors'
import { Result, err, ok } from '../types/result'
import { privy } from '../utils/privy'

export const policyService = {
  /**
   * Create a new policy in Privy
   */
  createPolicy: async (
    policyParams: PolicyCreateParams,
  ): Promise<Result<Policy>> => {
    try {
      const policy = await privy.policies().create(policyParams)
      return ok(policy)
    } catch (error) {
      console.error('[Privy] Failed to create policy:', error)
      return err(
        new AppError(
          'Failed to create policy',
          'POLICY_CREATE_FAILED',
          500,
          error,
        ),
      )
    }
  },

  /**
   * Get a policy from Privy by ID
   */
  getPolicy: async (policyId: string): Promise<Result<Policy>> => {
    try {
      const policy = await privy.policies().get(policyId)
      return ok(policy)
    } catch (error) {
      console.error(`[Privy] Failed to get policy ${policyId}:`, error)
      return err(
        new AppError('Failed to get policy', 'POLICY_GET_FAILED', 500, error),
      )
    }
  },

  /**
   * Update a policy in Privy
   */
  updatePolicy: async (
    policyId: string,
    policyParams: Partial<PolicyCreateParams>,
  ): Promise<Result<Policy>> => {
    try {
      // The privy SDK expects separate id and params instead of passing id within params.
      const policy = await privy.policies().update(policyId, policyParams)
      return ok(policy)
    } catch (error: any) {
      console.error(
        `[Privy] Failed to update policy ${policyId}:`,
        error?.response || error,
      )
      return err(
        new AppError(
          'Failed to update policy',
          'POLICY_UPDATE_FAILED',
          500,
          error,
        ),
      )
    }
  },

  /**
   * Delete a policy from Privy
   */
  deletePolicy: async (
    policyId: string,
  ): Promise<Result<{ success: boolean }>> => {
    try {
      // The Privy SDK's delete method expects the policy ID as the first argument,
      // and an optional options object (e.g., { authorization_context: {} }) as the second.
      // Based on the instruction, we're adding an empty options object as the second argument.
      await privy.policies().delete(policyId, {})
      return ok({ success: true })
    } catch (error) {
      console.error(`[Privy] Failed to delete policy ${policyId}:`, error)
      return err(
        new AppError(
          'Failed to delete policy',
          'POLICY_DELETE_FAILED',
          500,
          error,
        ),
      )
    }
  },
}
