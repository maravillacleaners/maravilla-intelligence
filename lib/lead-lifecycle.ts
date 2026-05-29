/**
 * Lead Lifecycle Engine
 * Rule: EVERY lead must ALWAYS have a next action (open task).
 * If it doesn't, this module provides the task that should be created.
 */

export interface LifecycleTask {
  Task: string
  Notes: string
  Status: 'Open'
  Priority: 'High' | 'Medium' | 'Low'
  Owner: string
  days_until_due: number
}

/**
 * Given a lead record (with fields), return the task that should be created for this stage.
 * Returns null for terminal stages (Won, Lost) — those handle their own tasks elsewhere.
 */
export function getDefaultTask(lead: { fields: any }): LifecycleTask | null {
  const f = lead.fields || {}
  const stage:       string = f.Stage        || 'New Signal'
  const entity_name: string = f.Entity_Name  || 'Unknown Entity'
  const source:      string = f.Source       || 'unknown'
  const score:       number = Number(f.Priority_Score || f.GovCon_Fit || 0)
  const agency:      string = f.Agency       || ''
  const dm_name:     string = f.Decision_Maker_Name  || ''
  const dm_email:    string = f.Decision_Maker_Email || ''

  switch (stage) {
    case 'New Signal':
      return {
        Task:  `Qualify: Review ${entity_name} — GovCon opportunity signal detected`,
        Notes: `Source: ${source}. Score: ${score}. Review and qualify for outreach. Agency: ${agency || 'N/A'}`,
        Status: 'Open',
        Priority: score >= 70 ? 'High' : 'Medium',
        Owner: 'Sales',
        days_until_due: 1,
      }

    case 'Contact Found':
      return {
        Task:  `Outreach: Send capabilities statement to ${entity_name}`,
        Notes: `Contact: ${dm_name} (${dm_email || 'find email'}). Score: ${score}. Prepare capabilities deck.`,
        Status: 'Open',
        Priority: score >= 70 ? 'High' : 'Medium',
        Owner: 'Sales',
        days_until_due: 2,
      }

    case 'Outreach Ready':
      return {
        Task:  `Follow up with ${entity_name} — check for response`,
        Notes: `Outreach sent. Check email/phone response. DM: ${dm_name || 'unknown'} (${dm_email || 'N/A'})`,
        Status: 'Open',
        Priority: 'Medium',
        Owner: 'Sales',
        days_until_due: 3,
      }

    case 'In Conversation':
      return {
        Task:  `Schedule walkthrough or proposal with ${entity_name}`,
        Notes: `Active conversation. Move to proposal stage. Contact: ${dm_name || 'unknown'}`,
        Status: 'Open',
        Priority: 'High',
        Owner: 'Sales',
        days_until_due: 2,
      }

    case 'Monitor':
      return {
        Task:  `Check status: ${entity_name} — monitor for opportunity`,
        Notes: `Set to monitor. Re-evaluate when contract cycle nears or new signals detected.`,
        Status: 'Open',
        Priority: 'Low',
        Owner: 'Sales',
        days_until_due: 30,
      }

    case 'Won':
    case 'Lost':
      // Terminal stages — won creates onboarding task separately; lost needs nothing.
      return null

    default:
      return {
        Task:  `Review: ${entity_name}`,
        Notes: `Lead needs attention — no default task for stage: ${stage}`,
        Status: 'Open',
        Priority: 'Medium',
        Owner: 'Sales',
        days_until_due: 3,
      }
  }
}

/**
 * Build full Airtable task record fields from a LifecycleTask + lead context.
 * Due_Date is computed from days_until_due relative to today.
 */
export function buildTaskFields(
  lifecycleTask: LifecycleTask,
  lead: { fields: any },
  leadId: string
): Record<string, any> {
  const f = lead.fields || {}

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + lifecycleTask.days_until_due)
  const dueDateStr = dueDate.toISOString().split('T')[0]

  return {
    Entity_Key:  f.Entity_Key  || '',
    Entity_Name: f.Entity_Name || '',
    Entity_Type: 'lead',
    Task:        lifecycleTask.Task,
    Notes:       lifecycleTask.Notes,
    Status:      lifecycleTask.Status,
    Priority:    lifecycleTask.Priority,
    Owner:       lifecycleTask.Owner,
    Due_Date:    dueDateStr,
    Created_At:  new Date().toISOString(),
  }
}
