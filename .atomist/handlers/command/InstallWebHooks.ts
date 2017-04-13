import {
    CommandHandler,
    Intent,
    MappedParameter,
    Parameter,
    ParseJson,
    ResponseHandler,
    Secrets,
    Tags } from "@atomist/rug/operations/Decorators";
import {
    Execute,
    HandleCommand,
    HandlerContext,
    HandleResponse,
    Instruction,
    MappedParameters,
    MessageMimeTypes,
    Plan,
    Respond,
    Respondable,
    Response,
    ResponseMessage } from "@atomist/rug/operations/Handlers";
import { wrap } from "@atomist/rugs/operations/CommonHandlers";
import { renderError, renderSuccess } from "@atomist/rugs/operations/messages/MessageRendering";
import { execute } from "@atomist/rugs/operations/PlanUtils";

@CommandHandler("InstallGitHubOrgWebhook", "Create a webhook for a whole organization")
@Tags("github", "webhooks")
@Secrets("github://user_token?scopes=admin:org_hook")
@Intent("install org-webhook")
class CreateOrgWebHookCommand implements HandleCommand {

    @MappedParameter(MappedParameters.GITHUB_REPO_OWNER)
    public owner: string;

    @MappedParameter("atomist://github_webhook_url")
    public url: string = "https://webhook.atomist.com/github";

    @MappedParameter("atomist://correlation_id")
    public corrid: string;

    public handle(ctx: HandlerContext): Plan {
        const plan = new Plan();
        const ex = execute("install-github-org-webhook", this);
        ex.onSuccess = success(this.owner, this.url),
            ex.onError = { kind: "respond", name: "GitHubWebhookErrors", parameters: this };
        plan.add(ex);
        return plan;
    }
}

export let command = new CreateOrgWebHookCommand();

@CommandHandler("InstallRepoWebhook", "Create a webhook for a repo")
@Tags("github", "webhooks")
@Secrets("github://user_token?scopes=repo")
@Intent("install webhook")
class InstallRepoWebhookCommand implements HandleCommand {

    @MappedParameter(MappedParameters.GITHUB_REPOSITORY)
    public repo: string;

    @MappedParameter(MappedParameters.GITHUB_REPO_OWNER)
    public owner: string;

    @MappedParameter("atomist://github_webhook_url")
    public url: string = "https://webhook.atomist.com/github";

    public handle(ctx: HandlerContext): Plan {
        const plan = new Plan();
        const execute: Respondable<Execute> = {
            instruction:
            { kind: "execute", name: "install-github-repo-webhook", parameters: this },
              onError: { kind: "respond", name: "GitHubWebhookErrors", parameters: this },
              onSuccess: success(this.owner, this.url, this.repo),
        };
        plan.add(execute);
        return plan;
    }
}

// Reusable creation of formatted success messages
function success(owner: string, url: string, repo?: string): Instruction<"respond"> {
    const repoStr = repo == null ? "" : `/${repo}`;
    return { kind: "respond",
             name: "GenericSuccessHandler",
             parameters: { msg: `Installed new webhook for ${owner}${repoStr} (${url})` } };
}

@ResponseHandler("GitHubWebhookErrors", "Custom error handling for some cases")
class WebHookErrorHandler implements HandleResponse<any> {

    @Parameter({ description: "Repo", pattern: "@any", required: false })
    public repo: string;

    @Parameter({ description: "Owner", pattern: "@any" })
    public owner: string;

    @Parameter({ description: "Webhook URL", pattern: "@url" })
    public url: string;

    @MappedParameter("atomist://correlation_id")
    public corrid: string;

    public handle( @ParseJson response: Response<any>): Plan {
        const errors = response.body.errors;
        try {
            if (errors[0].message === "Hook already exists on this organization") {
                return Plan.ofMessage(renderSuccess(`Webhook already installed for ${this.owner} (${this.url})`));
            }
            if (errors[0].message === "Hook already exists on this repository") {
                return Plan.ofMessage(
                    renderSuccess(`Webhook already installed for ${this.owner}/${this.repo} (${this.url})`));
            }
            return Plan.ofMessage(renderError(`${response.msg}: ${errors[0].message}`));
        } catch (ex) {
            return Plan.ofMessage(renderError(`Failed to install webhook: ${response.body.message}`));
        }
    }
}

export let errors = new WebHookErrorHandler();
export let repo = new InstallRepoWebhookCommand();
