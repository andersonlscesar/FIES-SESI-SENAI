package br.org.fies.stbp.usuario;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Formula;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;
    private String login;
    private String email;
    private String senhaHash;

    @Enumerated(EnumType.STRING)
    private Perfil perfil;

    @Enumerated(EnumType.STRING)
    private StatusUsuario status = StatusUsuario.ATIVO;

    private boolean trocarSenha = true;

    /** Criou alguma transferência ou saída de materiais: não pode ser excluído, só bloqueado (D-035). */
    @Formula("(exists (select 1 from transferencia t where t.criado_por_id = id)"
            + " or exists (select 1 from saida_material s where s.criado_por_id = id))")
    private boolean emUso;

    @CreationTimestamp
    @Column(updatable = false)
    private OffsetDateTime criadoEm;

    @UpdateTimestamp
    private OffsetDateTime atualizadoEm;

    protected Usuario() {
    }

    public Usuario(String nome, String login, String email, String senhaHash, Perfil perfil) {
        this.nome = nome;
        this.login = login;
        this.email = email;
        this.senhaHash = senhaHash;
        this.perfil = perfil;
    }

    public boolean isAtivo() {
        return status == StatusUsuario.ATIVO;
    }

    public void atualizarDados(String nome, String login, String email, Perfil perfil) {
        this.nome = nome;
        this.login = login;
        this.email = email;
        this.perfil = perfil;
    }

    /** Senha escolhida pelo próprio usuário. */
    public void definirSenha(String senhaHash) {
        this.senhaHash = senhaHash;
        this.trocarSenha = false;
    }

    /** Senha definida por um administrador: o usuário terá de trocá-la no próximo acesso. */
    public void redefinirSenha(String senhaHash) {
        this.senhaHash = senhaHash;
        this.trocarSenha = true;
    }

    public void alterarStatus(StatusUsuario status) {
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getLogin() {
        return login;
    }

    public String getEmail() {
        return email;
    }

    public String getSenhaHash() {
        return senhaHash;
    }

    public Perfil getPerfil() {
        return perfil;
    }

    public StatusUsuario getStatus() {
        return status;
    }

    public boolean isTrocarSenha() {
        return trocarSenha;
    }

    public boolean isEmUso() {
        return emUso;
    }

    public OffsetDateTime getCriadoEm() {
        return criadoEm;
    }

    public OffsetDateTime getAtualizadoEm() {
        return atualizadoEm;
    }
}
