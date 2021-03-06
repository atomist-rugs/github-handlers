/*
 * Copyright © 2017 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    CommandPlan,
    HandleCommand,
    HandlerContext,
    MappedParameters,
} from "@atomist/rug/operations/Handlers";

import {
    CommandHandler,
    Intent,
    MappedParameter,
    Parameter,
    Secrets,
    Tags,
} from "@atomist/rug/operations/Decorators";
import { handleErrors } from "@atomist/rugs/operations/CommonHandlers";

import { ChatTeam, GitHubId } from "@atomist/cortex/Types";
import { execute } from "@atomist/rugs/operations/PlanUtils";

@CommandHandler("AssignToMeGitHubIssue", "Assign a GitHub issue to the invoking user")
@Tags("github", "issues")
@Secrets("github://user_token?scopes=repo")
@Intent("assign issue to me")
class AssignToMeIssueCommand implements HandleCommand {

    @Parameter({ description: "The issue number", pattern: "^.*$" })
    public issue: number;

    @MappedParameter(MappedParameters.GITHUB_REPOSITORY)
    public repo: string;

    @MappedParameter(MappedParameters.SLACK_USER)
    public requester: string;

    @MappedParameter(MappedParameters.GITHUB_REPO_OWNER)
    public owner: string;

    @MappedParameter("atomist://github_api_url")
    public apiUrl: string = "https://api.github.com/";

    @MappedParameter("atomist://correlation_id")
    public corrid: string;

    public handle(context: HandlerContext): CommandPlan {
        const plan = new CommandPlan();

        const gitHubUser = context.pathExpressionEngine.scalar<ChatTeam, GitHubId>(
            context.contextRoot as ChatTeam,
            `/members::ChatId()[@userId='${this.requester}']/person::Person()/gitHubId::GitHubId()`,
        );

        const exec = execute("assign-github-issue",
            { issue: this.issue, owner: this.owner, repo: this.repo, assignee: gitHubUser.login, apiUrl: this.apiUrl });
        plan.add(handleErrors(exec));

        return plan;
    }
}

export let command = new AssignToMeIssueCommand();
