<?php

namespace App\Auth;

use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Auth\Authenticatable;

class ActiveUserProvider extends EloquentUserProvider
{
    // Covers credentials, session ID and remember-me token lookups.
    protected function newModelQuery($model = null)
    {
        $model ??= $this->createModel();

        return parent::newModelQuery($model)->where($model->qualifyColumn('is_active'), true);
    }

    public function validateCredentials(Authenticatable $user, #[\SensitiveParameter] array $credentials)
    {
        return $this->retrieveById($user->getAuthIdentifier()) !== null
            && parent::validateCredentials($user, $credentials);
    }
}
