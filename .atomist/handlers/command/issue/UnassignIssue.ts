import {HandleResponse, Execute, Respondable, HandleCommand, MappedParameters, Respond, Instruction, Response, HandlerContext , Plan, Message} from '@atomist/rug/operations/Handlers'
import {ResponseHandler, ParseJson, CommandHandler, Secrets, MappedParameter, Parameter, Tags, Intent} from '@atomist/rug/operations/Decorators'
import {wrap, exec} from '../../Common'

@CommandHandler("UnassignGitHubIssue", "Unassign a GitHub issue to a user")
@Tags("github", "issues")
@Secrets("github://user_token?scopes=repo")
@Intent("unassign issue")
class UnassignIssueCommand implements HandleCommand {
    
    @Parameter({description: "The issue number", pattern: "^.*$"})
    issue: number

    @Parameter({description: "The user to whom the issue should be unassigned", pattern: "^.*$"})
    assignee: string

    @MappedParameter(MappedParameters.GITHUB_REPOSITORY)
    repo: string

    @MappedParameter(MappedParameters.GITHUB_REPO_OWNER)
    owner: string

    @MappedParameter("atomist://correlation_id")
    corrid: string
    
    handle(ctx: HandlerContext): Plan {
        let plan = new Plan();
        let execute = exec("unassign-github-issue",this)
        plan.add(wrap(execute, `${this.owner}/${this.repo}#${this.issue} successfully unassigned from ${this.assignee}`, this))
        return plan;
    }
}

export let unassignIssue = new UnassignIssueCommand()
